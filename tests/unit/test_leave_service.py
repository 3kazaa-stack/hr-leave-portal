"""Unit tests for api/services/leave_service.py against a moto-mocked DynamoDB table.

leave_service creates its boto3 Table and reads TABLE_NAME at import time, so the
fixture sets the environment and creates the mocked table first, then imports the
module fresh for each test (same setup as test_employee_service.py).
"""

import importlib
import sys
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

API_DIR = Path(__file__).resolve().parents[2] / "api"
MODULE_NAME = "services.leave_service"
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
    """Create the mocked table, then import leave_service so it binds to it."""
    with mock_aws():
        table = _create_hr_table()
        sys.modules.pop(MODULE_NAME, None)
        service = importlib.import_module(MODULE_NAME)
        yield table, service
        sys.modules.pop(MODULE_NAME, None)


def _all_items_for(table, employee_id):
    return table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq(employee_id)
    )["Items"]


def test_save_writes_employee_id_as_pk_start_date_as_sk_with_end_date_and_note(table_and_service):
    # Arrange
    table, service = table_and_service

    # Act
    returned = service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-05", "note": "Family trip"})

    # Assert
    stored = table.get_item(Key={"PK": "a1b2c3d4", "SK": "2026-07-01"})["Item"]
    assert stored["PK"] == "a1b2c3d4"
    assert stored["SK"] == "2026-07-01"
    assert stored["endDate"] == "2026-07-05"
    assert stored["note"] == "Family trip"
    assert returned == stored


def test_save_defaults_note_to_empty_string_when_omitted(table_and_service):
    # Arrange
    table, service = table_and_service

    # Act
    returned = service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-05"})

    # Assert
    stored = table.get_item(Key={"PK": "a1b2c3d4", "SK": "2026-07-01"})["Item"]
    assert stored["note"] == ""
    assert returned["note"] == ""


def test_saving_same_employee_and_start_date_twice_overwrites_instead_of_duplicating(table_and_service):
    # Arrange
    table, service = table_and_service
    service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-05", "note": "First"})

    # Act
    service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-09", "note": "Extended"})

    # Assert
    items = _all_items_for(table, "a1b2c3d4")
    assert len(items) == 1
    assert items[0]["endDate"] == "2026-07-09"
    assert items[0]["note"] == "Extended"


def test_list_without_month_returns_all_leave_for_employee_sorted_by_start_date(table_and_service):
    # Arrange
    table, service = table_and_service
    service.save("a1b2c3d4", "2026-12-01", {"endDate": "2026-12-05"})
    service.save("a1b2c3d4", "2026-03-10", {"endDate": "2026-03-12"})
    service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-05"})
    service.save("zz999999", "2026-05-01", {"endDate": "2026-05-02"})  # another employee

    # Act
    items = service.list_for_employee("a1b2c3d4", None)

    # Assert
    assert [i["startDate"] for i in items] == ["2026-03-10", "2026-07-01", "2026-12-01"]
    assert all(i["PK"] == "a1b2c3d4" for i in items)


def test_list_with_month_returns_only_that_months_leave_and_excludes_other_months(table_and_service):
    # Arrange
    table, service = table_and_service
    service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-05"})
    service.save("a1b2c3d4", "2026-07-20", {"endDate": "2026-07-22"})
    service.save("a1b2c3d4", "2026-08-03", {"endDate": "2026-08-04"})

    # Act
    items = service.list_for_employee("a1b2c3d4", "2026-07")

    # Assert
    assert [i["SK"] for i in items] == ["2026-07-01", "2026-07-20"]
    assert all(i["SK"].startswith("2026-07") for i in items)
    assert "2026-08-03" not in [i["SK"] for i in items]


def test_list_for_employee_with_no_leave_returns_empty_list(table_and_service):
    # Arrange
    table, service = table_and_service
    service.save("a1b2c3d4", "2026-07-01", {"endDate": "2026-07-05"})  # someone else's leave

    # Act
    items = service.list_for_employee("nobody01", None)

    # Assert
    assert items == []
