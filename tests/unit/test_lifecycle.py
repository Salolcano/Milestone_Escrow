"""Lifecycle tests for MilestoneEscrow, including the client refund after a rejection.

They run the real contract file against the stand-in runtime in harness.py:
`pip install pytest` and `pytest tests/unit/ -v`.
"""

import json

import pytest

from tests.unit.harness import Deployment, UserError

CLIENT = "0x" + "c1" * 20
FREELANCER = "0x" + "f2" * 20
STRANGER = "0x" + "d3" * 20
OTHER_CLIENT = "0x" + "e4" * 20

URL = "https://work.example.org/logo"
REQUIREMENTS = "A public page that shows three logo options as PNG and SVG."
PAGE = "Final delivery: three logo options, PNG and SVG files attached."
PASS = {
    "deliverable_present": True,
    "requirements_met": True,
    "evidence_specific": True,
    "evidence_quote": "three logo options",
}
FAIL = {**PASS, "requirements_met": False}


def make(amount=100):
    """Deploy and fund escrow 1. Returns the deployment."""
    d = Deployment()
    d.rt.web[URL] = PAGE
    d.call("create_escrow", "Logo", FREELANCER, REQUIREMENTS, sender=CLIENT, value=amount)
    return d


def escrow(d, escrow_id="1"):
    return json.loads(d.contract.get_escrow(escrow_id))


def submit(d, verdict, escrow_id="1"):
    d.rt.llm = json.dumps(verdict)
    d.call("submit_evidence", escrow_id, URL, sender=FREELANCER)


# ------------------------------------------------------------- creation


def test_create_locks_funds_and_records_parties():
    d = make(250)
    e = escrow(d)
    assert (e["status"], e["attempts"], e["amount"]) == ("funded", 0, "250")
    assert e["client"] == CLIENT and e["freelancer"] == FREELANCER
    assert d.contract.get_total_locked() == "250"
    assert d.contract.get_escrow_count() == 1
    assert d.rt.transfers == []


@pytest.mark.parametrize(
    "args,value,message",
    [
        (("Logo", FREELANCER, REQUIREMENTS), 0, "attach the amount"),
        (("  ", FREELANCER, REQUIREMENTS), 5, "title is required"),
        (("Logo", FREELANCER, "too short"), 5, "requirements must describe"),
        (("Logo", CLIENT, REQUIREMENTS), 5, "must be different"),
    ],
)
def test_create_rejects_bad_input(args, value, message):
    d = Deployment()
    with pytest.raises(UserError, match=message):
        d.call("create_escrow", *args, sender=CLIENT, value=value)
    assert d.contract.get_escrow_count() == 0
    assert d.contract.get_total_locked() == "0"


# ---------------------------------------- the gap: denied, then stuck


def test_denied_submission_leaves_escrow_funded_and_cancel_blocked():
    """The situation that used to trap funds: cancel is closed after an attempt."""
    d = make()
    submit(d, FAIL)

    e = escrow(d)
    assert (e["status"], e["attempts"]) == ("funded", 1)
    with pytest.raises(UserError, match="refund_after_rejection"):
        d.call("cancel_escrow", "1", sender=CLIENT)


def test_client_can_refund_after_a_rejection():
    d = make(100)
    submit(d, FAIL)

    d.call("refund_after_rejection", "1", sender=CLIENT)

    e = escrow(d)
    assert e["status"] == "refunded"
    assert "reclaimed" in e["verdict_reason"]
    assert d.rt.transfers == [(CLIENT, 100)]
    assert d.contract.get_total_locked() == "0"


def test_refund_is_terminal_for_everyone():
    d = make()
    submit(d, FAIL)
    d.call("refund_after_rejection", "1", sender=CLIENT)

    with pytest.raises(UserError, match="already settled"):
        d.call("refund_after_rejection", "1", sender=CLIENT)  # no double payout
    with pytest.raises(UserError, match="already settled"):
        d.call("cancel_escrow", "1", sender=CLIENT)
    with pytest.raises(UserError, match="already settled"):
        submit(d, PASS)  # freelancer cannot revive it
    assert d.rt.transfers == [(CLIENT, 100)]
    assert escrow(d)["status"] == "refunded"


def test_refund_after_second_rejection_also_works():
    d = make()
    submit(d, FAIL)
    submit(d, FAIL)
    assert escrow(d)["attempts"] == 2

    d.call("refund_after_rejection", "1", sender=CLIENT)
    assert escrow(d)["status"] == "refunded"
    assert d.rt.transfers == [(CLIENT, 100)]


# ------------------------------------------------ who may do what


def test_refund_before_any_rejection_points_to_cancel():
    d = make()
    with pytest.raises(UserError, match="use cancel_escrow"):
        d.call("refund_after_rejection", "1", sender=CLIENT)
    assert escrow(d)["status"] == "funded"
    assert d.rt.transfers == []


@pytest.mark.parametrize("who", [FREELANCER, STRANGER])
def test_only_the_client_can_refund(who):
    d = make()
    submit(d, FAIL)
    with pytest.raises(UserError, match="only the client"):
        d.call("refund_after_rejection", "1", sender=who)
    assert escrow(d)["status"] == "funded"
    assert d.rt.transfers == []


def test_other_clients_cannot_refund_someone_elses_escrow():
    d = make()
    submit(d, FAIL)
    with pytest.raises(UserError, match="only the client"):
        d.call("refund_after_rejection", "1", sender=OTHER_CLIENT)


def test_unknown_escrow():
    d = make()
    with pytest.raises(UserError, match="escrow not found"):
        d.call("refund_after_rejection", "99", sender=CLIENT)


def test_cancel_still_works_before_any_attempt():
    d = make(70)
    d.call("cancel_escrow", "1", sender=CLIENT)
    assert escrow(d)["status"] == "cancelled"
    assert d.rt.transfers == [(CLIENT, 70)]
    assert d.contract.get_total_locked() == "0"


# ------------------------------- attempts only count decided rejections


@pytest.mark.parametrize(
    "setup",
    [
        lambda d: d.rt.web.update({URL: ""}),  # empty page: evidence unavailable
        lambda d: d.rt.web.update({URL: RuntimeError("down")}),  # render fails
    ],
)
def test_unavailable_evidence_does_not_unlock_a_refund(setup):
    d = make()
    setup(d)
    d.rt.llm = json.dumps(PASS)
    with pytest.raises(UserError, match="unavailable"):
        d.call("submit_evidence", "1", URL, sender=FREELANCER)

    assert escrow(d)["attempts"] == 0
    with pytest.raises(UserError, match="use cancel_escrow"):
        d.call("refund_after_rejection", "1", sender=CLIENT)


def test_unusable_model_output_does_not_unlock_a_refund():
    d = make()
    d.rt.llm = "sure, approved!"
    with pytest.raises(UserError, match="invalid"):
        d.call("submit_evidence", "1", URL, sender=FREELANCER)

    assert escrow(d)["attempts"] == 0
    with pytest.raises(UserError, match="use cancel_escrow"):
        d.call("refund_after_rejection", "1", sender=CLIENT)


# ----------------------------------------------- other terminal paths


def test_approval_releases_to_freelancer_and_closes_the_refund():
    d = make(100)
    submit(d, PASS)

    assert escrow(d)["status"] == "released"
    assert d.rt.transfers == [(FREELANCER, 100)]
    with pytest.raises(UserError, match="already settled"):
        d.call("refund_after_rejection", "1", sender=CLIENT)
    assert d.rt.transfers == [(FREELANCER, 100)]


def test_third_rejection_auto_refunds_and_closes_the_manual_refund():
    d = make(100)
    submit(d, FAIL)
    submit(d, FAIL)
    submit(d, FAIL)

    e = escrow(d)
    assert (e["status"], e["attempts"]) == ("refunded", 3)
    assert d.rt.transfers == [(CLIENT, 100)]
    with pytest.raises(UserError, match="already settled"):
        d.call("refund_after_rejection", "1", sender=CLIENT)
    assert d.rt.transfers == [(CLIENT, 100)]


def test_freelancer_can_still_win_after_a_rejection_if_client_waits():
    d = make(100)
    submit(d, FAIL)
    submit(d, PASS)
    assert escrow(d)["status"] == "released"
    assert d.rt.transfers == [(FREELANCER, 100)]


# ------------------------------------------------------ conservation


def test_conservation_across_several_escrows():
    d = Deployment()
    d.rt.web[URL] = PAGE
    amounts = {"1": 100, "2": 40, "3": 7, "4": 13}
    for amount in amounts.values():
        d.call("create_escrow", "Job", FREELANCER, REQUIREMENTS, sender=CLIENT, value=amount)
    assert d.contract.get_total_locked() == str(sum(amounts.values()))

    submit(d, FAIL, "1")
    d.call("refund_after_rejection", "1", sender=CLIENT)  # 100 back to client
    submit(d, PASS, "2")  # 40 to freelancer
    d.call("cancel_escrow", "3", sender=CLIENT)  # 7 back to client
    # escrow 4 stays funded

    paid_out = sum(amount for _, amount in d.rt.transfers)
    assert paid_out == 100 + 40 + 7
    assert d.contract.get_total_locked() == str(amounts["4"])
    assert escrow(d, "4")["status"] == "funded"
    assert [escrow(d, i)["status"] for i in "123"] == ["refunded", "released", "cancelled"]
    assert sum(amounts.values()) == paid_out + int(d.contract.get_total_locked())
