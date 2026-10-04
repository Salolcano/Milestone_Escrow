"""A small stand-in for the GenLayer runtime so the real contract file can run under plain pytest.

It is NOT the GenLayer VM. It fakes only what MilestoneEscrow touches:
senders, attached value, storage, web pages, model answers, strict_eq and payouts.
Money movement is recorded in `runtime.transfers` so tests can check conservation.
"""

import re
import sys
import types
from pathlib import Path
from types import SimpleNamespace

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "milestone_escrow.py"


class UserError(Exception):
    pass


class FakeAddress:
    def __init__(self, value):
        if isinstance(value, FakeAddress):
            value = value.as_hex
        if not isinstance(value, str) or not re.fullmatch(r"0x[0-9a-fA-F]{40}", value):
            raise ValueError(f"bad address: {value!r}")
        self.as_hex = value.lower()

    def __eq__(self, other):
        return isinstance(other, FakeAddress) and other.as_hex == self.as_hex

    def __hash__(self):
        return hash(self.as_hex)


class _TreeMapMarker:
    pass


class _TreeMapType:
    def __class_getitem__(cls, item):
        return _TreeMapMarker


class _FakeTreeMap(dict):
    pass


class Runtime:
    """Everything a test can set or inspect."""

    def __init__(self):
        self.sender = FakeAddress("0x" + "0" * 40)
        self.value = 0
        self.web = {}  # url -> page text, or an Exception to raise
        self.llm = ""  # str, or callable(prompt) -> str, or Exception
        self.prompts = []
        self.transfers = []  # (recipient_hex, amount) in order
        self.UserError = UserError
        self.Address = FakeAddress


def _build_modules(rt: Runtime):
    class Contract:
        def __new__(cls, *args, **kwargs):
            obj = object.__new__(cls)
            for name, annotation in getattr(cls, "__annotations__", {}).items():
                if annotation is _TreeMapMarker:
                    setattr(obj, name, _FakeTreeMap())
                elif annotation is int:
                    setattr(obj, name, 0)
            return obj

    def write(fn):
        return fn

    write.payable = lambda fn: fn

    def contract_interface(cls):
        class Bound:
            def __init__(self, address):
                self.address = FakeAddress(address)

            def emit_transfer(self, value):
                rt.transfers.append((self.address.as_hex, int(value)))

        return Bound

    def render(url, mode="text"):
        page = rt.web.get(url)
        if page is None:
            raise RuntimeError("page not reachable")
        if isinstance(page, Exception):
            raise page
        return page

    def exec_prompt(prompt):
        rt.prompts.append(prompt)
        answer = rt.llm(prompt) if callable(rt.llm) else rt.llm
        if isinstance(answer, Exception):
            raise answer
        return answer

    class Message:
        sender_address = property(lambda self: rt.sender)
        value = property(lambda self: rt.value)

    message = Message()

    gl = SimpleNamespace(
        contract=SimpleNamespace(Contract=Contract),
        public=SimpleNamespace(write=write, view=lambda fn: fn),
        vm=SimpleNamespace(UserError=UserError),
        evm=SimpleNamespace(contract_interface=contract_interface),
        storage=SimpleNamespace(TreeMap=_TreeMapType),
        eq_principle=SimpleNamespace(strict_eq=lambda fn: fn()),
        nondet=SimpleNamespace(web=SimpleNamespace(render=render), exec_prompt=exec_prompt),
        message=message,
    )
    gl_types = types.ModuleType("genlayer.types")
    gl_types.Address = FakeAddress
    gl_types.u256 = int
    gl_module = types.ModuleType("genlayer")
    gl_module.__dict__.update(vars(gl))
    return gl_module, gl_types


class Deployment:
    """A deployed contract plus the runtime it runs in."""

    def __init__(self):
        self.rt = Runtime()
        gl_module, gl_types = _build_modules(self.rt)
        saved = {k: sys.modules.get(k) for k in ("genlayer", "genlayer.types")}
        sys.modules["genlayer"] = gl_module
        sys.modules["genlayer.types"] = gl_types
        try:
            namespace = {"__name__": "milestone_escrow_under_test"}
            exec(compile(CONTRACT_PATH.read_text(), str(CONTRACT_PATH), "exec"), namespace)
        finally:
            for key, old in saved.items():
                if old is None:
                    sys.modules.pop(key, None)
                else:
                    sys.modules[key] = old
        self.module = namespace
        self.contract = namespace["MilestoneEscrow"]()
        self.contract.__init__()

    def call(self, method, *args, sender, value=0):
        """Call a contract method as `sender`, optionally attaching `value`."""
        self.rt.sender = FakeAddress(sender)
        self.rt.value = value
        try:
            return getattr(self.contract, method)(*args)
        finally:
            self.rt.value = 0
