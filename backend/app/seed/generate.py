"""Deterministic demo dataset.

Every run with the same ``SEED`` produces the same primary keys, values, and
relationships. Timestamps are fixed so re-seeds stay byte-identical for deep
links recorded in the walkthrough.
"""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from flask import current_app

from ..enums import (
    AnnotationKind,
    DocType,
    DocumentStatus,
    EntityType,
    FieldState,
    LinkTarget,
    RequestStatus,
    ReturnStatus,
    Role,
    TaskPriority,
    TaskStatus,
    TransformKind,
    Visibility,
)
from ..extensions import db
from ..models import (
    AiAnnotation,
    Client,
    Document,
    DocumentPage,
    Membership,
    Message,
    Provenance,
    Request,
    ReturnField,
    ReturnSection,
    Task,
    TaxReturn,
    Thread,
    ThreadLink,
    Transform,
    TransformInput,
    User,
)
from ..services.prioritize import score_tasks

# Fixed "today" for overdue math — matches Config.SEED default (20260723).
AS_OF = date(2026, 7, 23)
EPOCH = datetime(2026, 1, 15, 14, 0, 0, tzinfo=timezone.utc)

ISSUERS: tuple[str, ...] = (
    "Acme Corp",
    "Beta LLC",
    "First National Bank",
    "Contoso Industries",
    "Fabrikam Partners",
    "Northwind Benefits",
    "Horizon Credit Union",
    "Summit Payroll Co",
    "Oakridge Trust",
    "Brightline Capital",
    "Meadowbrook Mutual",
    "Cedar Ridge Holdings",
    "Pioneer Shipping",
    "Atlas Health Group",
)

DOC_TYPE_LABELS: dict[DocType, str] = {
    DocType.W2: "W-2",
    DocType.FORM_1099_NEC: "1099-NEC",
    DocType.FORM_1099_INT: "1099-INT",
    DocType.FORM_1099_DIV: "1099-DIV",
    DocType.FORM_1098: "1098",
    DocType.K1: "Schedule K-1",
    DocType.RECEIPT: "Receipt",
    DocType.BANK_STATEMENT: "Bank statement",
    DocType.PRIOR_RETURN: "Prior-year return",
    DocType.OTHER: "Supporting document",
}


def run_seed(seed: int | None = None) -> None:
    """Drop all tables, recreate schema, and populate the demo dataset."""
    if seed is None:
        seed = int(current_app.config["SEED"])

    rng = random.Random(seed)

    db.drop_all()
    db.create_all()

    _seed_identity()
    _seed_returns()
    _seed_hero_documents_and_traceability()
    _seed_volume_documents(rng)
    tasks = _seed_tasks(rng)
    score_tasks(tasks, as_of=AS_OF)
    _seed_ai_annotations()
    _seed_threads()

    db.session.commit()


def _ts(days: int = 0, hours: int = 0) -> datetime:
    return EPOCH + timedelta(days=days, hours=hours)


def _money(value: str | float | int | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _seed_identity() -> None:
    users = [
        User(
            id="usr_dana_reyes",
            name="Dana Reyes",
            email="dana.reyes@ledger.example",
            initials="DR",
            title="Senior preparer",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
        User(
            id="usr_marcus_hale",
            name="Marcus Hale",
            email="marcus.hale@ledger.example",
            initials="MH",
            title="Review partner",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
        User(
            id="usr_priya_anand",
            name="Priya Anand",
            email="priya.anand@ledger.example",
            initials="PA",
            title="Firm admin / taxpayer",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
        User(
            id="usr_alex_northwind",
            name="Alex Northwind",
            email="alex@northwind.example",
            initials="AN",
            title="Owner",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
        User(
            id="usr_casey_nguyen",
            name="Casey Nguyen",
            email="casey.nguyen@ledger.example",
            initials="CN",
            title="Seasonal staff",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
        User(
            id="usr_jordan_blake",
            name="Jordan Blake",
            email="jordan.blake@ledger.example",
            initials="JB",
            title="Seasonal staff",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
        User(
            id="usr_morgan_meridian",
            name="Morgan Meridian",
            email="morgan@meridian.example",
            initials="MM",
            title="Designer",
            created_at=_ts(0),
            updated_at=_ts(0),
        ),
    ]
    db.session.add_all(users)
    db.session.flush()

    clients = [
        Client(
            id="clt_northwind",
            display_name="Northwind Traders",
            entity_type=EntityType.S_CORP,
            primary_contact_id="usr_alex_northwind",
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
        Client(
            id="clt_priya_anand",
            display_name="Priya Anand",
            entity_type=EntityType.INDIVIDUAL,
            primary_contact_id="usr_priya_anand",
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
        Client(
            id="clt_oakridge",
            display_name="Oakridge Consulting",
            entity_type=EntityType.SOLE_PROP,
            primary_contact_id=None,
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
        Client(
            id="clt_harbor",
            display_name="Harbor Collective LLP",
            entity_type=EntityType.PARTNERSHIP,
            primary_contact_id=None,
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
        Client(
            id="clt_brightline",
            display_name="Brightline Robotics Inc",
            entity_type=EntityType.C_CORP,
            primary_contact_id=None,
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
        Client(
            id="clt_meadowbrook",
            display_name="Sam Meadowbrook",
            entity_type=EntityType.INDIVIDUAL,
            primary_contact_id=None,
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
        Client(
            id="clt_meridian",
            display_name="Morgan Meridian",
            entity_type=EntityType.INDIVIDUAL,
            primary_contact_id="usr_morgan_meridian",
            created_at=_ts(1),
            updated_at=_ts(1),
        ),
    ]
    db.session.add_all(clients)
    db.session.flush()

    memberships = [
        Membership(
            id="mem_dana_preparer",
            user_id="usr_dana_reyes",
            role=Role.PREPARER,
            client_id=None,
            label="Firm preparer",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_marcus_reviewer",
            user_id="usr_marcus_hale",
            role=Role.REVIEWER,
            client_id=None,
            label="Firm reviewer",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_priya_admin",
            user_id="usr_priya_anand",
            role=Role.FIRM_ADMIN,
            client_id=None,
            label="Firm admin",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_priya_taxpayer",
            user_id="usr_priya_anand",
            role=Role.INDIVIDUAL_TAXPAYER,
            client_id="clt_priya_anand",
            label="My personal return",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_alex_owner",
            user_id="usr_alex_northwind",
            role=Role.BUSINESS_OWNER,
            client_id="clt_northwind",
            label="Northwind Traders",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_casey_seasonal",
            user_id="usr_casey_nguyen",
            role=Role.SEASONAL_STAFF,
            client_id=None,
            label="Seasonal staff",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_jordan_seasonal",
            user_id="usr_jordan_blake",
            role=Role.SEASONAL_STAFF,
            client_id=None,
            label="Seasonal staff",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
        Membership(
            id="mem_morgan_taxpayer",
            user_id="usr_morgan_meridian",
            role=Role.INDIVIDUAL_TAXPAYER,
            client_id="clt_meridian",
            label="My personal return",
            created_at=_ts(2),
            updated_at=_ts(2),
        ),
    ]
    db.session.add_all(memberships)
    db.session.flush()


def _seed_returns() -> None:
    """Sixteen returns covering every ReturnStatus; hero is ret_northwind_2025."""
    specs: list[tuple[str, str, int, str, ReturnStatus, date, str | None, str | None, str | None]] = [
        # hero
        (
            "ret_northwind_2025",
            "clt_northwind",
            2025,
            "1120-S",
            ReturnStatus.PENDING_REVIEW,
            date(2026, 3, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            "4200.00",
        ),
        (
            "ret_northwind_2024",
            "clt_northwind",
            2024,
            "1120-S",
            ReturnStatus.ACCEPTED,
            date(2025, 3, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            "3100.00",
        ),
        (
            "ret_priya_2025",
            "clt_priya_anand",
            2025,
            "1040",
            ReturnStatus.IN_PREPARATION,
            date(2026, 4, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            "1800.00",
        ),
        (
            "ret_priya_2024",
            "clt_priya_anand",
            2024,
            "1040",
            ReturnStatus.FILED,
            date(2025, 4, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            None,
        ),
        (
            "ret_oakridge_2025",
            "clt_oakridge",
            2025,
            "1040",
            ReturnStatus.DOCS_REQUESTED,
            date(2026, 4, 15),
            "usr_dana_reyes",
            None,
            None,
        ),
        (
            "ret_oakridge_2024",
            "clt_oakridge",
            2024,
            "1040",
            ReturnStatus.ACCEPTED,
            date(2025, 4, 15),
            "usr_casey_nguyen",
            "usr_marcus_hale",
            "950.00",
        ),
        (
            "ret_harbor_2025",
            "clt_harbor",
            2025,
            "1065",
            ReturnStatus.DOCS_RECEIVED,
            date(2026, 3, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            None,
        ),
        (
            "ret_harbor_2024",
            "clt_harbor",
            2024,
            "1065",
            ReturnStatus.CLIENT_APPROVAL,
            date(2025, 3, 15),
            "usr_jordan_blake",
            "usr_marcus_hale",
            "2200.00",
        ),
        (
            "ret_brightline_2025",
            "clt_brightline",
            2025,
            "1120",
            ReturnStatus.INTAKE,
            date(2026, 4, 15),
            None,
            None,
            None,
        ),
        (
            "ret_brightline_2024",
            "clt_brightline",
            2024,
            "1120",
            ReturnStatus.FILED,
            date(2025, 4, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            None,
        ),
        (
            "ret_meadowbrook_2025",
            "clt_meadowbrook",
            2025,
            "1040",
            ReturnStatus.IN_PREPARATION,
            date(2026, 4, 15),
            "usr_casey_nguyen",
            "usr_marcus_hale",
            "640.00",
        ),
        (
            "ret_meadowbrook_2024",
            "clt_meadowbrook",
            2024,
            "1040",
            ReturnStatus.ACCEPTED,
            date(2025, 4, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            "410.00",
        ),
        (
            "ret_northwind_ext_2025",
            "clt_northwind",
            2025,
            "7004",
            ReturnStatus.DOCS_REQUESTED,
            date(2026, 2, 28),
            "usr_jordan_blake",
            None,
            None,
        ),
        (
            "ret_harbor_q1_est",
            "clt_harbor",
            2026,
            "1040-ES",
            ReturnStatus.INTAKE,
            date(2026, 4, 15),
            "usr_dana_reyes",
            None,
            None,
        ),
        (
            "ret_brightline_ext_2025",
            "clt_brightline",
            2025,
            "7004",
            ReturnStatus.CLIENT_APPROVAL,
            date(2026, 3, 15),
            "usr_dana_reyes",
            "usr_marcus_hale",
            None,
        ),
        # Client first-run demo — docs_requested with two outstanding upload requests
        (
            "ret_meridian_2025",
            "clt_meridian",
            2025,
            "1040",
            ReturnStatus.DOCS_REQUESTED,
            date(2026, 4, 15),
            "usr_dana_reyes",
            None,
            None,
        ),
    ]

    # Guarantee every status appears (already true above; assert for maintainers).
    covered = {s[4] for s in specs}
    missing = set(ReturnStatus) - covered
    if missing:
        raise RuntimeError(f"Seed returns missing statuses: {sorted(m.value for m in missing)}")
    if len(specs) != 16:
        raise RuntimeError(f"Expected 16 returns, got {len(specs)}")

    for i, (rid, cid, year, form, status, due, prep, rev, refund) in enumerate(specs):
        db.session.add(
            TaxReturn(
                id=rid,
                client_id=cid,
                tax_year=year,
                form_type=form,
                status=status,
                preparer_id=prep,
                reviewer_id=rev,
                due_date=due,
                refund_estimate=_money(refund),
                created_at=_ts(3, i),
                updated_at=_ts(3, i),
            )
        )
    db.session.flush()

    _seed_hero_structure()
    _seed_meridian_first_run()


def _seed_meridian_first_run() -> None:
    """Client first-run demo: two outstanding upload requests drive the portal."""
    db.session.add(
        Thread(
            id="thr_meridian_docs",
            subject="Documents we still need",
            visibility=Visibility.CLIENT_VISIBLE,
            resolved_at=None,
            awaiting_role=Role.INDIVIDUAL_TAXPAYER,
            awaiting_user_id="usr_morgan_meridian",
            created_at=_ts(5, 10),
            updated_at=_ts(5, 10),
        )
    )
    db.session.flush()
    db.session.add(
        ThreadLink(
            id="trl_meridian_return",
            thread_id="thr_meridian_docs",
            target_type=LinkTarget.RETURN,
            target_id="ret_meridian_2025",
        )
    )
    db.session.add(
        Message(
            id="msg_meridian_docs_1",
            thread_id="thr_meridian_docs",
            author_id="usr_dana_reyes",
            body=(
                "Morgan — please upload your W-2 and 1099-INT so we can start "
                "preparing your return."
            ),
            visibility=Visibility.CLIENT_VISIBLE,
            created_at=_ts(5, 11),
            updated_at=_ts(5, 11),
        )
    )
    db.session.add_all(
        [
            Request(
                id="req_meridian_w2",
                thread_id="thr_meridian_docs",
                label="Upload your W-2",
                status=RequestStatus.OUTSTANDING,
                owner_user_id="usr_morgan_meridian",
                due_date=date(2026, 3, 15),
                fulfilled_by_document_id=None,
                created_at=_ts(5, 12),
                updated_at=_ts(5, 12),
            ),
            Request(
                id="req_meridian_1099_int",
                thread_id="thr_meridian_docs",
                label="Upload your 1099-INT",
                status=RequestStatus.OUTSTANDING,
                owner_user_id="usr_morgan_meridian",
                due_date=date(2026, 3, 15),
                fulfilled_by_document_id=None,
                created_at=_ts(5, 13),
                updated_at=_ts(5, 13),
            ),
        ]
    )
    db.session.flush()


def _seed_hero_structure() -> None:
    sections = [
        ("sec_nw_income", "income", "Income", 0),
        ("sec_nw_adjustments", "adjustments", "Adjustments", 1),
        ("sec_nw_deductions", "deductions", "Deductions", 2),
        ("sec_nw_tax", "tax_payments", "Tax & Payments", 3),
    ]
    for sid, code, label, order in sections:
        db.session.add(
            ReturnSection(
                id=sid,
                return_id="ret_northwind_2025",
                code=code,
                label=label,
                sort_order=order,
            )
        )
    db.session.flush()

    fields: list[tuple[str, str, str, str, str | None, FieldState, str | None, int]] = [
        # Income
        (
            "fld_1040_l1a",
            "sec_nw_income",
            "1a",
            "Wages, salaries, tips",
            "84200.00",
            FieldState.AI_CALCULATED,
            None,
            0,
        ),
        (
            "fld_1040_l2b",
            "sec_nw_income",
            "2b",
            "Taxable interest",
            "312.00",
            FieldState.AI_EXTRACTED,
            None,
            1,
        ),
        (
            "fld_1040_l9",
            "sec_nw_income",
            "9",
            "Total income",
            "84512.00",
            FieldState.AI_CALCULATED,
            None,
            2,
        ),
        # Adjustments
        (
            "fld_1040_l10",
            "sec_nw_adjustments",
            "10",
            "Educator expenses",
            "250.00",
            FieldState.CLIENT_ANSWERED,
            None,
            0,
        ),
        (
            "fld_1040_l11",
            "sec_nw_adjustments",
            "11",
            "Adjusted gross income",
            "84262.00",
            FieldState.AI_CALCULATED,
            None,
            1,
        ),
        # Deductions
        (
            "fld_1040_l12",
            "sec_nw_deductions",
            "12",
            "Standard deduction",
            "14600.00",
            FieldState.VERIFIED,
            None,
            0,
        ),
        (
            "fld_1040_l13",
            "sec_nw_deductions",
            "13",
            "Qualified business income deduction",
            None,
            FieldState.EMPTY,
            None,
            1,
        ),
        # Tax & Payments
        (
            "fld_1040_l25a",
            "sec_nw_tax",
            "25a",
            "Federal income tax withheld",
            "11240.00",
            FieldState.AI_EXTRACTED,
            None,
            0,
        ),
        (
            "fld_1040_ein",
            "sec_nw_tax",
            "EIN",
            "Employer identification number",
            None,
            FieldState.LOCKED,
            "EIN locks after IRS e-file authentication completes.",
            1,
        ),
    ]

    for fid, sec, line, label, value, state, locked, order in fields:
        db.session.add(
            ReturnField(
                id=fid,
                section_id=sec,
                line_ref=line,
                label=label,
                value=_money(value),
                unit="USD",
                state=state,
                locked_reason=locked,
                sort_order=order,
                created_at=_ts(4),
                updated_at=_ts(4),
            )
        )
    db.session.flush()


def _w2_html(*, employer: str, ein: str, employee: str, box1: str, box2: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body {{ font-family: "Instrument Sans", system-ui, sans-serif; color: #12211F; margin: 24px; }}
  h1 {{ font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 16px; }}
  table {{ border-collapse: collapse; width: 100%; max-width: 640px; }}
  th, td {{ border: 1px solid #DDE0DA; padding: 8px 10px; font-size: 13px; text-align: left; }}
  th {{ background: #E8F0E9; font-weight: 500; width: 40%; }}
  td.num {{ font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; text-align: right; }}
  .box {{ color: #0B6E4F; font-size: 11px; }}
</style></head><body>
  <h1>Form W-2 Wage and Tax Statement</h1>
  <table>
    <tr><th>Employer name</th><td>{employer}</td></tr>
    <tr><th>Employer EIN</th><td class="num">{ein}</td></tr>
    <tr><th>Employee</th><td>{employee}</td></tr>
    <tr><th><span class="box">Box 1</span> Wages, tips, other compensation</th><td class="num">{box1}</td></tr>
    <tr><th><span class="box">Box 2</span> Federal income tax withheld</th><td class="num">{box2}</td></tr>
  </table>
</body></html>"""


def _int_html(*, payer: str, tin: str, recipient: str, box1: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body {{ font-family: "Instrument Sans", system-ui, sans-serif; color: #12211F; margin: 24px; }}
  h1 {{ font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 16px; }}
  table {{ border-collapse: collapse; width: 100%; max-width: 640px; }}
  th, td {{ border: 1px solid #DDE0DA; padding: 8px 10px; font-size: 13px; text-align: left; }}
  th {{ background: #E8F0E9; font-weight: 500; width: 40%; }}
  td.num {{ font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; text-align: right; }}
  .box {{ color: #0B6E4F; font-size: 11px; }}
</style></head><body>
  <h1>Form 1099-INT Interest Income</h1>
  <table>
    <tr><th>Payer</th><td>{payer}</td></tr>
    <tr><th>Payer TIN</th><td class="num">{tin}</td></tr>
    <tr><th>Recipient</th><td>{recipient}</td></tr>
    <tr><th><span class="box">Box 1</span> Interest income</th><td class="num">{box1}</td></tr>
  </table>
</body></html>"""


def _seed_hero_documents_and_traceability() -> None:
    """Hero docs, pages, provenances, and transforms."""
    docs = [
        Document(
            id="doc_w2_acme",
            client_id="clt_northwind",
            doc_type=DocType.W2,
            title="W-2 — Acme Corp",
            filename="w2_acme_2025.pdf",
            issuer="Acme Corp",
            tax_year=2025,
            page_count=1,
            status=DocumentStatus.EXTRACTED,
            uploaded_at=_ts(5),
            uploaded_by_id="usr_alex_northwind",
            created_at=_ts(5),
            updated_at=_ts(5),
        ),
        Document(
            id="doc_w2_beta",
            client_id="clt_northwind",
            doc_type=DocType.W2,
            title="W-2 — Beta LLC",
            filename="w2_beta_2025.pdf",
            issuer="Beta LLC",
            tax_year=2025,
            page_count=1,
            status=DocumentStatus.EXTRACTED,
            uploaded_at=_ts(5, 1),
            uploaded_by_id="usr_alex_northwind",
            created_at=_ts(5, 1),
            updated_at=_ts(5, 1),
        ),
        Document(
            id="doc_1099_int_fnb",
            client_id="clt_northwind",
            doc_type=DocType.FORM_1099_INT,
            title="1099-INT — First National Bank",
            filename="1099_int_fnb_2025.pdf",
            issuer="First National Bank",
            tax_year=2025,
            page_count=1,
            status=DocumentStatus.ACCEPTED,
            uploaded_at=_ts(5, 2),
            uploaded_by_id="usr_alex_northwind",
            created_at=_ts(5, 2),
            updated_at=_ts(5, 2),
        ),
    ]
    db.session.add_all(docs)

    pages = [
        DocumentPage(
            id="page_w2_acme_1",
            document_id="doc_w2_acme",
            page_no=1,
            body_html=_w2_html(
                employer="Acme Corp",
                ein="12-3456789",
                employee="Alex Northwind",
                box1="61500.00",
                box2="8200.00",
            ),
            ocr_text="Acme Corp W-2 Box 1 61500.00 Box 2 8200.00",
        ),
        DocumentPage(
            id="page_w2_beta_1",
            document_id="doc_w2_beta",
            page_no=1,
            body_html=_w2_html(
                employer="Beta LLC",
                ein="98-7654321",
                employee="Alex Northwind",
                box1="22700.00",
                box2="3040.00",
            ),
            ocr_text="Beta LLC W-2 Box 1 22700.00 Box 2 3040.00",
        ),
        DocumentPage(
            id="page_1099_int_fnb_1",
            document_id="doc_1099_int_fnb",
            page_no=1,
            body_html=_int_html(
                payer="First National Bank",
                tin="11-2233445",
                recipient="Alex Northwind",
                box1="312.00",
            ),
            ocr_text="First National Bank 1099-INT Box 1 312.00",
        ),
    ]
    db.session.add_all(pages)
    db.session.flush()

    provenances = [
        Provenance(
            id="prv_w2_acme_box1",
            field_id="fld_1040_l1a",
            page_id="page_w2_acme_1",
            box_label="Box 1",
            raw_value=_money("61500.00"),
            snippet="61500.00",
            bbox_x=58.0,
            bbox_y=34.0,
            bbox_w=18.0,
            bbox_h=6.0,
        ),
        Provenance(
            id="prv_w2_beta_box1",
            field_id="fld_1040_l1a",
            page_id="page_w2_beta_1",
            box_label="Box 1",
            raw_value=_money("22700.00"),
            snippet="22700.00",
            bbox_x=58.0,
            bbox_y=34.0,
            bbox_w=18.0,
            bbox_h=6.0,
        ),
        Provenance(
            id="prv_1099_int_box1",
            field_id="fld_1040_l2b",
            page_id="page_1099_int_fnb_1",
            box_label="Box 1",
            raw_value=_money("312.00"),
            snippet="312.00",
            bbox_x=58.0,
            bbox_y=42.0,
            bbox_w=18.0,
            bbox_h=6.0,
        ),
        Provenance(
            id="prv_w2_acme_box2",
            field_id="fld_1040_l25a",
            page_id="page_w2_acme_1",
            box_label="Box 2",
            raw_value=_money("8200.00"),
            snippet="8200.00",
            bbox_x=58.0,
            bbox_y=42.0,
            bbox_w=18.0,
            bbox_h=6.0,
        ),
        Provenance(
            id="prv_w2_beta_box2",
            field_id="fld_1040_l25a",
            page_id="page_w2_beta_1",
            box_label="Box 2",
            raw_value=_money("3040.00"),
            snippet="3040.00",
            bbox_x=58.0,
            bbox_y=42.0,
            bbox_w=18.0,
            bbox_h=6.0,
        ),
    ]
    db.session.add_all(provenances)
    db.session.flush()

    # fld_1040_l1a = sum of W-2 Box 1 values via provenances
    db.session.add(
        Transform(
            id="xf_l1a_sum",
            field_id="fld_1040_l1a",
            kind=TransformKind.SUM,
            expression="W-2 Box 1 (Acme) + W-2 Box 1 (Beta)",
            human_explanation=(
                "Summed Box 1 wages from the Acme Corp and Beta LLC W-2s."
            ),
            authority="IRC §61",
            sort_order=0,
            created_at=_ts(6),
            updated_at=_ts(6),
        )
    )
    db.session.flush()
    db.session.add_all(
        [
            TransformInput(
                id="xfi_l1a_acme",
                transform_id="xf_l1a_sum",
                provenance_id="prv_w2_acme_box1",
                source_field_id=None,
                operator="+",
                sort_order=0,
            ),
            TransformInput(
                id="xfi_l1a_beta",
                transform_id="xf_l1a_sum",
                provenance_id="prv_w2_beta_box1",
                source_field_id=None,
                operator="+",
                sort_order=1,
            ),
        ]
    )

    # fld_1040_l2b = direct from 1099-INT
    db.session.add(
        Transform(
            id="xf_l2b_direct",
            field_id="fld_1040_l2b",
            kind=TransformKind.DIRECT,
            expression="1099-INT Box 1 (First National Bank)",
            human_explanation="Copied Box 1 interest income from the First National Bank 1099-INT.",
            authority="IRC §61(a)(4)",
            sort_order=0,
            created_at=_ts(6),
            updated_at=_ts(6),
        )
    )
    db.session.flush()
    db.session.add(
        TransformInput(
            id="xfi_l2b_fnb",
            transform_id="xf_l2b_direct",
            provenance_id="prv_1099_int_box1",
            source_field_id=None,
            operator="+",
            sort_order=0,
        )
    )

    # fld_1040_l9 = recursive sum of fields (not provenances)
    db.session.add(
        Transform(
            id="xf_l9_sum",
            field_id="fld_1040_l9",
            kind=TransformKind.SUM,
            expression="Line 1a + Line 2b",
            human_explanation="Total income is the sum of wages (line 1a) and taxable interest (line 2b).",
            authority="Form 1040 instructions",
            sort_order=0,
            created_at=_ts(6),
            updated_at=_ts(6),
        )
    )
    db.session.flush()
    db.session.add_all(
        [
            TransformInput(
                id="xfi_l9_l1a",
                transform_id="xf_l9_sum",
                provenance_id=None,
                source_field_id="fld_1040_l1a",
                operator="+",
                sort_order=0,
            ),
            TransformInput(
                id="xfi_l9_l2b",
                transform_id="xf_l9_sum",
                provenance_id=None,
                source_field_id="fld_1040_l2b",
                operator="+",
                sort_order=1,
            ),
        ]
    )

    # Withholding sum from W-2 Box 2 provenances
    db.session.add(
        Transform(
            id="xf_l25a_sum",
            field_id="fld_1040_l25a",
            kind=TransformKind.SUM,
            expression="W-2 Box 2 (Acme) + W-2 Box 2 (Beta)",
            human_explanation="Summed federal withholding from both W-2s.",
            authority="Form 1040 line 25a",
            sort_order=0,
            created_at=_ts(6),
            updated_at=_ts(6),
        )
    )
    db.session.flush()
    db.session.add_all(
        [
            TransformInput(
                id="xfi_l25a_acme",
                transform_id="xf_l25a_sum",
                provenance_id="prv_w2_acme_box2",
                source_field_id=None,
                operator="+",
                sort_order=0,
            ),
            TransformInput(
                id="xfi_l25a_beta",
                transform_id="xf_l25a_sum",
                provenance_id="prv_w2_beta_box2",
                source_field_id=None,
                operator="+",
                sort_order=1,
            ),
        ]
    )

    # AGI = total income − educator expenses (field refs)
    db.session.add(
        Transform(
            id="xf_l11_sub",
            field_id="fld_1040_l11",
            kind=TransformKind.SUBTRACT,
            expression="Line 9 − Line 10",
            human_explanation="Adjusted gross income after subtracting client-reported educator expenses.",
            authority="Form 1040 line 11",
            sort_order=0,
            created_at=_ts(6),
            updated_at=_ts(6),
        )
    )
    db.session.flush()
    db.session.add_all(
        [
            TransformInput(
                id="xfi_l11_l9",
                transform_id="xf_l11_sub",
                provenance_id=None,
                source_field_id="fld_1040_l9",
                operator="+",
                sort_order=0,
            ),
            TransformInput(
                id="xfi_l11_l10",
                transform_id="xf_l11_sub",
                provenance_id=None,
                source_field_id="fld_1040_l10",
                operator="-",
                sort_order=1,
            ),
        ]
    )
    db.session.flush()


def _placeholder_html(title: str, issuer: str, year: int) -> str:
    return (
        f"<!DOCTYPE html><html><body style=\"font-family:Instrument Sans,system-ui;"
        f"color:#12211F;margin:24px\">"
        f"<h1 style=\"font-size:14px\">{title}</h1>"
        f"<p>{issuer} · tax year "
        f"<span style=\"font-family:'IBM Plex Mono',monospace\">{year}</span></p>"
        f"<p>Placeholder page for search and filter demos.</p>"
        f"</body></html>"
    )


def _seed_volume_documents(rng: random.Random) -> None:
    client_ids = [
        "clt_northwind",
        "clt_priya_anand",
        "clt_oakridge",
        "clt_harbor",
        "clt_brightline",
        "clt_meadowbrook",
    ]
    statuses = list(DocumentStatus)
    doc_types = list(DocType)
    years = [2023, 2024, 2025]
    uploaders = [
        "usr_alex_northwind",
        "usr_priya_anand",
        "usr_dana_reyes",
        "usr_casey_nguyen",
        None,
    ]

    for i in range(320):
        doc_type = doc_types[i % len(doc_types)]
        issuer = ISSUERS[i % len(ISSUERS)]
        status = statuses[i % len(statuses)]
        year = years[i % len(years)]
        client_id = client_ids[i % len(client_ids)]
        label = DOC_TYPE_LABELS[doc_type]
        title = f"{label} — {issuer}"
        doc_id = f"doc_vol_{i:04d}"
        page_id = f"page_vol_{i:04d}"
        uploaded = status is not DocumentStatus.REQUESTED
        db.session.add(
            Document(
                id=doc_id,
                client_id=client_id,
                doc_type=doc_type,
                title=title,
                filename=f"{doc_id}.pdf",
                issuer=issuer,
                tax_year=year,
                page_count=1,
                status=status,
                uploaded_at=_ts(10, i % 24) if uploaded else None,
                uploaded_by_id=rng.choice(uploaders) if uploaded else None,
                created_at=_ts(10, i % 24),
                updated_at=_ts(10, i % 24),
            )
        )
        db.session.add(
            DocumentPage(
                id=page_id,
                document_id=doc_id,
                page_no=1,
                body_html=_placeholder_html(title, issuer, year),
                ocr_text=f"{title} {year}",
            )
        )
    db.session.flush()


def _open_return_ids() -> list[str]:
    open_statuses = {
        ReturnStatus.INTAKE,
        ReturnStatus.DOCS_REQUESTED,
        ReturnStatus.DOCS_RECEIVED,
        ReturnStatus.IN_PREPARATION,
        ReturnStatus.PENDING_REVIEW,
        ReturnStatus.CLIENT_APPROVAL,
    }
    rows = db.session.query(TaxReturn).filter(TaxReturn.status.in_(open_statuses)).all()
    return [r.id for r in rows]


def _seed_tasks(rng: random.Random) -> list[Task]:
    open_returns = _open_return_ids()
    if not open_returns:
        raise RuntimeError("No open returns available for task seeding")

    titles = [
        "Request missing K-1",
        "Verify W-2 Box 1 totals",
        "Reconcile estimated payments",
        "Confirm QBI election",
        "Review charitable deductions",
        "Chase prior-year carryforward",
        "Clarify home-office square footage",
        "Validate 1099-NEC payees",
        "Check state withholding",
        "Prepare organizer follow-up",
        "Resolve basis worksheet gap",
        "Confirm filing method",
        "Review AI-extracted interest",
        "Obtain signed engagement letter",
        "Update client contact email",
    ]
    details = [
        "Blocked until the client uploads the supporting schedule.",
        "Cross-check against payroll summary.",
        "Client said amounts may have changed mid-year.",
        None,
    ]
    statuses = list(TaskStatus)
    priorities = list(TaskPriority)
    owner_roles = [Role.PREPARER, Role.REVIEWER, Role.SEASONAL_STAFF, Role.FIRM_ADMIN]
    owners = [
        "usr_dana_reyes",
        "usr_marcus_hale",
        "usr_casey_nguyen",
        "usr_jordan_blake",
        "usr_priya_anand",
        None,
    ]

    tasks: list[Task] = []
    for i in range(40):
        # Due dates from overdue (AS_OF - 20) through AS_OF + 30.
        due = AS_OF + timedelta(days=-20 + (i % 51))
        status = statuses[i % len(statuses)]
        task = Task(
            id=f"tsk_seed_{i:02d}",
            return_id=open_returns[i % len(open_returns)],
            title=titles[i % len(titles)],
            detail=details[i % len(details)],
            status=status,
            priority=priorities[i % len(priorities)],
            owner_role=owner_roles[i % len(owner_roles)],
            owner_user_id=rng.choice(owners),
            due_date=due,
            blocked_by_id=None,
            priority_score=0.0,
            created_at=_ts(12, i),
            updated_at=_ts(12, i),
        )
        tasks.append(task)

    # Ensure hero return has several visible tasks.
    for i, title in enumerate(
        [
            "Confirm QBI K-1 before review sign-off",
            "Re-check Beta LLC W-2 Box 1 highlight",
            "Interest anomaly — compare to prior year",
        ]
    ):
        tasks[i].return_id = "ret_northwind_2025"
        tasks[i].title = title
        tasks[i].owner_user_id = "usr_dana_reyes" if i < 2 else "usr_marcus_hale"
        tasks[i].owner_role = Role.PREPARER if i < 2 else Role.REVIEWER

    db.session.add_all(tasks)
    db.session.flush()

    # blocked_by chains: a few blocked tasks point at open/in_progress blockers.
    chain_pairs = [(5, 0), (9, 1), (13, 2), (17, 4), (21, 8), (25, 12)]
    for blocked_idx, blocker_idx in chain_pairs:
        tasks[blocked_idx].blocked_by_id = tasks[blocker_idx].id
        tasks[blocked_idx].status = TaskStatus.BLOCKED

    if set(t.status for t in tasks) != set(TaskStatus):
        raise RuntimeError("Task seed missing a TaskStatus value")
    if set(t.priority for t in tasks) != set(TaskPriority):
        raise RuntimeError("Task seed missing a TaskPriority value")

    return tasks


def _seed_ai_annotations() -> None:
    """Annotations for every AI field on the hero return, plus one anomaly."""
    # Confidence bands: high >= 0.90, medium >= 0.70, low < 0.70.
    # fld_1040_l1a intentionally medium.
    specs: list[tuple[str, str, AnnotationKind, str, str, float, str | None, str | None]] = [
        (
            "ann_fld_l1a",
            "fld_1040_l1a",
            AnnotationKind.CALCULATION,
            "Wages summed from two W-2s",
            "Calculated line 1a by adding Box 1 from the Acme Corp and Beta LLC W-2s.",
            0.82,
            "Box labels were clear, but OCR confidence on the Beta total was only moderate.",
            "Review the Beta LLC Box 1 highlight",
        ),
        (
            "ann_fld_l2b",
            "fld_1040_l2b",
            AnnotationKind.EXTRACTION,
            "Interest pulled from 1099-INT",
            "Extracted Box 1 interest income from the First National Bank 1099-INT.",
            0.96,
            None,
            None,
        ),
        (
            "ann_fld_l9",
            "fld_1040_l9",
            AnnotationKind.CALCULATION,
            "Total income from lines 1a and 2b",
            "Summed wages (line 1a) and taxable interest (line 2b) to produce total income.",
            0.94,
            None,
            None,
        ),
        (
            "ann_fld_l11",
            "fld_1040_l11",
            AnnotationKind.CALCULATION,
            "AGI after educator expenses",
            "Subtracted client-answered educator expenses from total income to reach AGI.",
            0.91,
            None,
            None,
        ),
        (
            "ann_fld_l25a",
            "fld_1040_l25a",
            AnnotationKind.EXTRACTION,
            "Withholding summed from W-2 Box 2",
            "Extracted and summed federal withholding from the Acme and Beta W-2 Box 2 cells.",
            0.64,
            "Beta LLC Box 2 sits near a shaded cell edge; confirm the OCR digit boundary.",
            "Open the Beta W-2 and verify Box 2",
        ),
    ]

    for ann_id, field_id, kind, headline, rationale, conf, note, action in specs:
        db.session.add(
            AiAnnotation(
                id=ann_id,
                target_type=LinkTarget.FIELD,
                target_id=field_id,
                kind=kind,
                headline=headline,
                rationale=rationale,
                uncertainty_note=note,
                suggested_action=action,
                suggested_value=None,
                confidence=conf,
                model_name="claude-sonnet-4-6",
                is_simulated=True,
                created_at=_ts(14),
                updated_at=_ts(14),
            )
        )

    db.session.add(
        AiAnnotation(
            id="ann_ret_interest_anomaly",
            target_type=LinkTarget.RETURN,
            target_id="ret_northwind_2025",
            kind=AnnotationKind.ANOMALY,
            headline="Interest income differs from prior year by 240%",
            rationale=(
                "Taxable interest on line 2b is 240% higher than the prior-year return; "
                "confirm the First National Bank 1099-INT covers the full year."
            ),
            uncertainty_note="YoY comparison used last year's accepted return as baseline.",
            suggested_action="Ask the client whether a new account was opened in 2025",
            suggested_value=None,
            confidence=0.78,
            model_name="claude-sonnet-4-6",
            is_simulated=True,
            created_at=_ts(14, 1),
            updated_at=_ts(14, 1),
        )
    )
    db.session.flush()


def _seed_threads() -> None:
    # Internal thread on doc_w2_beta — Dana + Marcus
    db.session.add(
        Thread(
            id="thr_w2_beta_internal",
            subject="Beta LLC W-2 Box 1 looks soft",
            visibility=Visibility.INTERNAL,
            resolved_at=None,
            awaiting_role=Role.REVIEWER,
            awaiting_user_id="usr_marcus_hale",
            created_at=_ts(15),
            updated_at=_ts(15),
        )
    )
    db.session.flush()
    db.session.add(
        ThreadLink(
            id="trl_w2_beta",
            thread_id="thr_w2_beta_internal",
            target_type=LinkTarget.DOCUMENT,
            target_id="doc_w2_beta",
        )
    )
    db.session.add_all(
        [
            Message(
                id="msg_w2_beta_1",
                thread_id="thr_w2_beta_internal",
                author_id="usr_dana_reyes",
                body=(
                    "Marcus — the Beta LLC Box 1 highlight is sitting a bit high on the "
                    "table. Can you confirm 22,700 before you sign off?"
                ),
                visibility=Visibility.INTERNAL,
                created_at=_ts(15, 1),
                updated_at=_ts(15, 1),
            ),
            Message(
                id="msg_w2_beta_2",
                thread_id="thr_w2_beta_internal",
                author_id="usr_marcus_hale",
                body=(
                    "Will check against payroll. Leave the provenance ribbon up when "
                    "you walk me through it."
                ),
                visibility=Visibility.INTERNAL,
                created_at=_ts(15, 2),
                updated_at=_ts(15, 2),
            ),
        ]
    )

    # Client-visible thread on QBI field — awaiting business owner
    db.session.add(
        Thread(
            id="thr_qbi_k1",
            subject="QBI deduction needs your K-1",
            visibility=Visibility.CLIENT_VISIBLE,
            resolved_at=None,
            awaiting_role=Role.BUSINESS_OWNER,
            awaiting_user_id="usr_alex_northwind",
            created_at=_ts(16),
            updated_at=_ts(16),
        )
    )
    db.session.flush()
    db.session.add(
        ThreadLink(
            id="trl_qbi_field",
            thread_id="thr_qbi_k1",
            target_type=LinkTarget.FIELD,
            target_id="fld_1040_l13",
        )
    )
    db.session.add(
        Message(
            id="msg_qbi_1",
            thread_id="thr_qbi_k1",
            author_id="usr_dana_reyes",
            body=(
                "Alex — we still need the Schedule K-1 to calculate your qualified "
                "business income deduction on line 13. Can you upload it when you have it?"
            ),
            visibility=Visibility.CLIENT_VISIBLE,
            created_at=_ts(16, 1),
            updated_at=_ts(16, 1),
        )
    )
    db.session.add(
        Request(
            id="req_qbi_k1",
            thread_id="thr_qbi_k1",
            label="Provide K-1 for QBI calculation",
            status=RequestStatus.OUTSTANDING,
            owner_user_id="usr_alex_northwind",
            due_date=date(2026, 3, 1),
            fulfilled_by_document_id=None,
            created_at=_ts(16, 2),
            updated_at=_ts(16, 2),
        )
    )
    db.session.flush()
