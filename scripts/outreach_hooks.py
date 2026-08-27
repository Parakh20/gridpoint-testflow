"""Hand-written hook sentences, one per phase-1 company.

The hook is the only sentence in an outreach email that proves a person read the
company's website. It lives here rather than being generated because every
attempt to splice it out of the `why_fit` research produced broken English --
those fields are notes (fragments, ampersands, "=" shorthand), not prose.

Each is written from the researched facts and nothing else. Do not add a claim
here that isn't in the lead record or on the company's own site: the hook is
quoted back at the prospect on the call, and a wrong one destroys the
credibility it was meant to build.

Keyed by the `leads.company_name` value. A company with no entry falls back to
the placeholder, which is the correct behaviour -- an obvious blank beats a
generic sentence.
"""

HOOKS = {
    'Akuntha Projects Pvt Ltd':
        "You're running erection, T&C and O&M across Gujarat with a lot of "
        "substations live at once. That concurrency is exactly where test "
        "records stop being findable.",

    'Transerect Testing & Commissioning Engineers Pvt Ltd':
        "Transerect is built purely around T&C, so the site test report isn't a "
        "by-product for you — it is the deliverable. That's the part this makes "
        "automatic.",

    'GK Expertise / GK Power Expertise Pvt Ltd':
        "You're running OMICRON, Megger and Doble across every major relay make, "
        "AIS and GIS, and writing site test reports off the back of all of it. "
        "The reports are the part I'm trying to make automatic.",

    'Elite Powertech Pvt Ltd (EPPL)':
        "You run a dedicated T&C team on EHV substations up to 765 kV with many "
        "projects going at once. At that volume the handover backlog is an "
        "arithmetic problem before it's anything else.",

    'ARRAA Energy':
        "You test every protection relay type on OMICRON, Megger and Doble, and "
        "hand over formal IEC/IEEE test reports at the end. Those kits each "
        "produce their own output; the report is still assembled afterwards. "
        "That assembly is what this removes.",

    'Powertest Asia Pvt Ltd (PtA)':
        "As an independent TPIA your report is the product — clients pay for its "
        "credibility precisely because you're not tied to an OEM. Thirty years "
        "of that reputation is a lot to leave sitting in files on individual "
        "laptops.",

    'Sun and Jay Engineering Consultants Pvt Ltd':
        "You cover ABB, Siemens, GE, SEL and Alstom relays across Tamil Nadu — "
        "every make with its own output format, and one coherent handover pack "
        "expected at the end of the job.",

    'Voltage Infra Pvt Ltd':
        "You're growing fast across solar EPC and substation O&M in Maharashtra. "
        "Growth is exactly when test records stop fitting in whatever worked at "
        "ten projects.",

    'Ghaziabad Testing Laboratories Pvt Ltd':
        "NABL accreditation means every result has to be traceable to who "
        "recorded it and when. That trail is kept automatically here rather than "
        "reconstructed when someone asks for it.",

    'Eternergy Engineering Pvt Ltd':
        "You run T&C to IS standards across EHV substations, transformer yards, "
        "RMUs and pad-mount switchgear, on projects in two countries. The more "
        "standards and sites in play, the more of the handover pack is manual "
        "assembly.",
}


def hook_for(company_name):
    """The hook sentence for a company, or None to fall back to the placeholder."""
    return HOOKS.get(company_name)
