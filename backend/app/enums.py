"""Domain enums.

Every value in here is mirrored as a TypeScript union in
`frontend/src/lib/types.ts`. Change one, change the other in the same commit.
"""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    """The six roles the platform serves.

    A user holds these through `Membership`, not directly, so one person can be
    a preparer at the firm and an individual taxpayer with their own return.
    """

    INDIVIDUAL_TAXPAYER = "individual_taxpayer"
    BUSINESS_OWNER = "business_owner"
    PREPARER = "preparer"
    REVIEWER = "reviewer"
    FIRM_ADMIN = "firm_admin"
    SEASONAL_STAFF = "seasonal_staff"

    @property
    def is_firm_side(self) -> bool:
        return self in {
            Role.PREPARER,
            Role.REVIEWER,
            Role.FIRM_ADMIN,
            Role.SEASONAL_STAFF,
        }


class EntityType(StrEnum):
    INDIVIDUAL = "individual"
    SOLE_PROP = "sole_prop"
    PARTNERSHIP = "partnership"
    S_CORP = "s_corp"
    C_CORP = "c_corp"


class ReturnStatus(StrEnum):
    """Canonical return lifecycle.

    Ordered. `stage_index` gives progress a single unambiguous number so the
    client tracker and the staff tracker can never disagree about where a
    return is — they render the same value at different depths.
    """

    INTAKE = "intake"
    DOCS_REQUESTED = "docs_requested"
    DOCS_RECEIVED = "docs_received"
    IN_PREPARATION = "in_preparation"
    PENDING_REVIEW = "pending_review"
    CLIENT_APPROVAL = "client_approval"
    FILED = "filed"
    ACCEPTED = "accepted"

    @property
    def stage_index(self) -> int:
        return list(ReturnStatus).index(self)

    @property
    def client_label(self) -> str:
        """What the taxpayer sees. Deliberately coarser than the staff label."""
        return {
            ReturnStatus.INTAKE: "Getting started",
            ReturnStatus.DOCS_REQUESTED: "We need some documents",
            ReturnStatus.DOCS_RECEIVED: "We have what we need",
            ReturnStatus.IN_PREPARATION: "Your return is being prepared",
            ReturnStatus.PENDING_REVIEW: "Your return is being prepared",
            ReturnStatus.CLIENT_APPROVAL: "Ready for your approval",
            ReturnStatus.FILED: "Filed with the IRS",
            ReturnStatus.ACCEPTED: "Accepted by the IRS",
        }[self]

    @property
    def staff_label(self) -> str:
        return {
            ReturnStatus.INTAKE: "Intake",
            ReturnStatus.DOCS_REQUESTED: "Docs requested",
            ReturnStatus.DOCS_RECEIVED: "Docs received",
            ReturnStatus.IN_PREPARATION: "In preparation",
            ReturnStatus.PENDING_REVIEW: "Pending reviewer sign-off",
            ReturnStatus.CLIENT_APPROVAL: "Awaiting client approval",
            ReturnStatus.FILED: "Filed",
            ReturnStatus.ACCEPTED: "Accepted",
        }[self]


class FieldState(StrEnum):
    """Drives the entire interaction language. See AGENTS.md section 6."""

    EMPTY = "empty"
    AI_EXTRACTED = "ai_extracted"
    AI_CALCULATED = "ai_calculated"
    CLIENT_ANSWERED = "client_answered"
    VERIFIED = "verified"
    LOCKED = "locked"

    @property
    def is_ai_generated(self) -> bool:
        return self in {FieldState.AI_EXTRACTED, FieldState.AI_CALCULATED}

    @property
    def is_editable(self) -> bool:
        return self is not FieldState.LOCKED

    @property
    def needs_review(self) -> bool:
        """AI output that no human has confirmed yet."""
        return self.is_ai_generated


class DocType(StrEnum):
    W2 = "w2"
    FORM_1099_NEC = "1099_nec"
    FORM_1099_INT = "1099_int"
    FORM_1099_DIV = "1099_div"
    FORM_1098 = "1098"
    K1 = "k1"
    RECEIPT = "receipt"
    BANK_STATEMENT = "bank_statement"
    PRIOR_RETURN = "prior_return"
    OTHER = "other"


class DocumentStatus(StrEnum):
    REQUESTED = "requested"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    NEEDS_ATTENTION = "needs_attention"
    ACCEPTED = "accepted"


class TransformKind(StrEnum):
    """How a field's value was derived from its inputs.

    `DIRECT` means one source value copied verbatim. Everything else means the
    field has a computation history worth showing the user.
    """

    DIRECT = "direct"
    SUM = "sum"
    SUBTRACT = "subtract"
    MULTIPLY = "multiply"
    LOOKUP = "lookup"
    MANUAL_OVERRIDE = "manual_override"


class TaskStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"


class TaskPriority(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class Visibility(StrEnum):
    """Whether a thread or message is client-visible or firm-internal.

    This is the permission boundary the collaboration layer is graded on. It is
    enforced in the service layer, never in the frontend.
    """

    INTERNAL = "internal"
    CLIENT_VISIBLE = "client_visible"


class LinkTarget(StrEnum):
    """Polymorphic anchor types for a thread.

    Threads have no home of their own — they only ever surface attached to the
    thing they are about. This is what keeps the messaging layer from
    collapsing into a generic inbox.
    """

    RETURN = "return"
    DOCUMENT = "document"
    FIELD = "field"
    TASK = "task"


class RequestStatus(StrEnum):
    OUTSTANDING = "outstanding"
    FULFILLED = "fulfilled"
    WAIVED = "waived"


class AnnotationKind(StrEnum):
    EXTRACTION = "extraction"
    CALCULATION = "calculation"
    RECOMMENDATION = "recommendation"
    WARNING = "warning"
    ANOMALY = "anomaly"


class ConfidenceBand(StrEnum):
    """Bands, not raw percentages.

    Users cannot act differently on 0.82 versus 0.79, but they can act
    differently on "review this" versus "this is fine". The raw score is still
    stored and shown on demand; the band is what drives the UI.
    """

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

    @classmethod
    def from_score(cls, score: float) -> "ConfidenceBand":
        if score >= 0.90:
            return cls.HIGH
        if score >= 0.70:
            return cls.MEDIUM
        return cls.LOW
