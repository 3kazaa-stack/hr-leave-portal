<<<<<<< HEAD
from fastapi import APIRouter, Query

from models import LeaveIn
=======
from datetime import date

from fastapi import APIRouter, Query

from models import LeaveIn, LeaveUpdate
>>>>>>> addLeaveRequests
from services import leave_service

router = APIRouter(tags=["leave"])


@router.post("/employees/{employee_id}/leave", status_code=201)
<<<<<<< HEAD
def create_leave(employee_id: str, payload: LeaveIn):
=======
def create_leave(employee_id: str, payload@router.put("/employees/{employee_id}/leave/{start_date}")
def save_leave(employee_id: str, start_date: date, payload: LeaveUpdate):
    return leave_service.save(
        employee_id, start_date.isoformat(), payload.model_dump(mode="json")
    ): LeaveIn):
>>>>>>> addLeaveRequests
    body = payload.model_dump(mode="json")
    return leave_service.save(employee_id, body["startDate"], body)


@router.get("/employees/{employee_id}/leave")
def list_leave(
    employee_id: str, month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$")
):
<<<<<<< HEAD
    return {"leave": leave_service.list_for_employee(employee_id, month)}
=======
    return {"leave": leave_service.list_for_employee(employee_id, month)}
    
>>>>>>> addLeaveRequests
