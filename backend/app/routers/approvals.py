# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models.models import ApprovalRequest, User, AuditLog
from app.ai.groq_client import generate_approval_risk_assessment
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("/")
def list_approvals(
    status: Optional[str] = "PENDING",
    db: Session = Depends(get_db),
):
    """List approval requests."""
    query = db.query(ApprovalRequest)
    if status:
        query = query.filter(ApprovalRequest.status == status)
    approvals = query.order_by(ApprovalRequest.created_at.desc()).limit(50).all()

    result = []
    for a in approvals:
        requester = db.query(User).filter(User.id == a.requested_by).first()
        assignee = db.query(User).filter(User.id == a.assigned_to).first()
        result.append({
            "id": a.id,
            "request_type": a.request_type,
            "reference_label": a.reference_label,
            "status": a.status,
            "ai_risk_score": a.ai_risk_score,
            "ai_recommendation": a.ai_recommendation,
            "action_comment": a.action_comment,
            "requested_by": requester.name if requester else "System",
            "assigned_to": assignee.name if assignee else "Category Leader",
            "expires_at": a.expires_at.isoformat() if a.expires_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "actioned_at": a.actioned_at.isoformat() if a.actioned_at else None,
        })
    return result


@router.get("/summary")
def approval_summary(db: Session = Depends(get_db)):
    """Summary of pending approvals by type."""
    pending = db.query(ApprovalRequest).filter(ApprovalRequest.status == "PENDING").all()
    by_type = {}
    for a in pending:
        by_type[a.request_type] = by_type.get(a.request_type, 0) + 1

    total_approved_today = db.query(ApprovalRequest).filter(
        ApprovalRequest.status == "APPROVED",
        ApprovalRequest.actioned_at >= datetime.utcnow().replace(hour=0, minute=0, second=0),
    ).count()

    return {
        "pending_count": len(pending),
        "approved_today": total_approved_today,
        "by_type": by_type,
        "high_risk_pending": sum(1 for a in pending if a.ai_risk_score >= 70),
    }


class ActionRequest(BaseModel):
    comment: Optional[str] = None
    actioned_by: str = "category_leader"


@router.post("/{approval_id}/approve")
def approve_request(approval_id: str, req: ActionRequest, db: Session = Depends(get_db)):
    """Approve a pending request."""
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(404, "Approval request not found")
    if approval.status != "PENDING":
        raise HTTPException(400, f"Cannot approve — current status: {approval.status}")

    approval.status = "APPROVED"
    approval.action_comment = req.comment
    approval.actioned_by = req.actioned_by
    approval.actioned_at = datetime.utcnow()

    # Audit log
    log = AuditLog(
        table_name="approval_requests",
        record_id=approval_id,
        action="APPROVE",
        actor_name=req.actioned_by,
        new_value={"status": "APPROVED", "comment": req.comment},
    )
    db.add(log)
    db.commit()
    return {"status": "APPROVED", "id": approval_id}


@router.post("/{approval_id}/reject")
def reject_request(approval_id: str, req: ActionRequest, db: Session = Depends(get_db)):
    """Reject a pending request."""
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(404, "Approval request not found")
    if approval.status != "PENDING":
        raise HTTPException(400, f"Cannot reject — current status: {approval.status}")
    if not req.comment:
        raise HTTPException(400, "Rejection requires a comment/reason")

    approval.status = "REJECTED"
    approval.action_comment = req.comment
    approval.actioned_by = req.actioned_by
    approval.actioned_at = datetime.utcnow()

    log = AuditLog(
        table_name="approval_requests",
        record_id=approval_id,
        action="REJECT",
        actor_name=req.actioned_by,
        new_value={"status": "REJECTED", "comment": req.comment},
    )
    db.add(log)
    db.commit()
    return {"status": "REJECTED", "id": approval_id}


class CreateApprovalRequest(BaseModel):
    request_type: str
    reference_id: str
    reference_label: str
    details: dict = {}
    requested_by: str = "category_leader"
    assigned_to: str = "category_head"


@router.post("/create")
def create_approval(req: CreateApprovalRequest, db: Session = Depends(get_db)):
    """Create a new approval request with AI risk assessment."""
    risk = generate_approval_risk_assessment(req.request_type, req.details)

    approval = ApprovalRequest(
        request_type=req.request_type,
        reference_id=req.reference_id,
        reference_label=req.reference_label,
        requested_by="system",
        assigned_to="system",
        ai_risk_score=risk.get("risk_score", 50),
        ai_recommendation=f"[{risk.get('risk_level', 'MEDIUM')}] {risk.get('recommended_action', 'REVIEW')} — {risk.get('justification', '')}",
        expires_at=datetime.utcnow() + timedelta(hours=4),
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return {"id": approval.id, "risk_assessment": risk}


@router.get("/audit-log")
def audit_log(limit: int = 50, db: Session = Depends(get_db)):
    """Get recent audit log entries."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "table_name": l.table_name,
            "action": l.action,
            "actor_name": l.actor_name,
            "new_value": l.new_value,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
