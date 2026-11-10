"""Unit tests for api/services/employee_service.py against a moto-mocked DynamoDB table.

employee_service creates its boto3 Table and reads TABLE_NAME at import time, so the
fixture sets the environment and creates the mocked table first, then imports the
module fresh for each test.
"""

import importlib
import sys
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

API_DIR = Path(__file__).resolve().parents[2] / "api"
MODULE_NAME = "services.employee_service"
TABLE_NAME = "HrTable-test"
REGION = "us-east-1"


def _create_hr_table():
    """Mirror the HrTable schema in hr_leave_portal/backend_stack.py."""
    dynamodb = boto3.client("dynamodb", region_name=REGION)
    dynamodb.create_table(
        TableName=TABLE_NAME,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "GSI1",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    )
    return boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


@pytest.fixture
def aws_env(monkeypatch):
    """Fake credentials and region so nothing can reach a real AWS account."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)
    monkeypatch.setenv("POWERTOOLS_TRACE_DISABLED", "true")
    monkeypatch.setenv("TABLE_NAME", TABLE_NAME)
    monkeypatch.syspath_prepend(str(API_DIR))


@pytest.fixture
def table_and_service(aws_env):
    """Create the mocked table, then import employee_service so it binds to it."""
    with mock_aws():
        table = _create_hr_table()
        sys.modules.pop(MODULE_NAME, None)
        service = importlib.import_module(MODULE_NAME)
        yield table, service
        sys.modules.pop(MODULE_NAME, None)


def _employee_data(**overrides):
    data = {
        "name": "Jane Doe",
        "department": "Finance",
        "startDate": "2026-01-15",
        "role": "manager",
    }
    data.update(overrides)
    return data


def test_create_writes_user_item_with_generated_8_char_id_as_sort_key(table_and_service):
    # Arrange
    table, service = table_and_service

    # Act
    item = service.create(_employee_data())

    # Assert
    employee_id = item["SK"]
    assert len(employee_id) == 8
    assert item["PK"] == "USER"
    assert item["employeeId"] == employee_id
    stored = table.get_item(Key={"PK": "USER", "SK": employee_id})["Item"]
    assert stored == item


def test_create_called_twice_generates_two_different_ids(table_and_service):
    # Arrange
    table, service = table_and_service

    # Act
    first = service.create(_employee_data(name="Jane Doe"))
    second = service.create(_employee_data(name="John Roe"))

    # Assert
    assert first["employeeId"] != second["employeeId"]
    stored = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq("USER")
    )["Items"]
    assert {e["employeeId"] for e in stored} == {first["employeeId"], second["employeeId"]}


def test_save_writes_exactly_the_expected_item(table_and_service):
    # Arrange
    table, service = table_and_service
    data = _employee_data()

    # Act
    returned = service.save("a1b2c3d4", data)

    # Assert
    expected = {
        "PK": "USER",
        "SK": "a1b2c3d4",
        "GSI1PK": "USER_BY_DATE",
        "GSI1SK": "2026-01-15",
        "employeeId": "a1b2c3d4",
        "name": "Jane Doe",
        "department": "Finance",
        "startDate": "2026-01-15",
        "role": "manager",
    }
    stored = table.get_item(Key={"PK": "USER", "SK": "a1b2c3d4"})["Item"]
    assert stored == expected
    assert returned == expected


def test_save_defaults_role_to_employee_when_input_omits_it(table_and_service):
    # Arrange
    table, service = table_and_service
    data = _employee_data()
    del data["role"]

    # Act
    returned = service.save("e5f6a7b8", data)

    # Assert
    stored = table.get_item(Key={"PK": "USER", "SK": "e5f6a7b8"})["Item"]
    assert stored["role"] == "employee"
    assert returned["role"] == "employee"
