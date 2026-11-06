const ILLUSTRATION_BODIES =
{
    'no-jobs':
        '<rect class="il-paper" x="34" y="36" width="92" height="62" rx="8"/>' +
        '<path class="il-line" d="M64 36v-6a4 4 0 014-4h24a4 4 0 014 4v6M34 62h92"/>' +
        '<rect class="il-mark" x="72" y="57" width="16" height="10" rx="2"/>' +
        '<path class="il-faint" d="M46 78h28M46 87h44"/>',

    'no-applicants':
        '<rect class="il-paper" x="28" y="20" width="104" height="82" rx="10"/>' +
        '<circle class="il-line" cx="46" cy="40" r="6"/>' +
        '<path class="il-faint" d="M60 38h54M60 45h32"/>' +
        '<circle class="il-line" cx="46" cy="62" r="6" stroke-dasharray="3 4"/>' +
        '<rect class="il-mark" x="58" y="57" width="58" height="10" rx="3"/>' +
        '<circle class="il-line" cx="46" cy="84" r="6" stroke-dasharray="3 4"/>' +
        '<path class="il-faint" d="M60 84h40"/>',

    'no-applications':
        '<rect class="il-paper" x="44" y="16" width="72" height="88" rx="8" stroke-dasharray="5 5"/>' +
        '<path class="il-faint" d="M58 34h44M58 44h30"/>' +
        '<rect class="il-mark" x="58" y="54" width="44" height="9" rx="3"/>' +
        '<circle class="il-paper" cx="80" cy="84" r="11"/>' +
        '<path class="il-line" d="M80 78v12M74 84h12"/>',

    'no-results':
        '<path class="il-faint" d="M26 34h72M26 48h48M26 62h58"/>' +
        '<circle class="il-paper" cx="94" cy="64" r="22"/>' +
        '<rect class="il-mark" x="80" y="60" width="28" height="8" rx="3"/>' +
        '<path class="il-line" d="M110 80l18 18"/>',

    'no-interviews':
        '<rect class="il-paper" x="30" y="26" width="100" height="74" rx="10"/>' +
        '<path class="il-line" d="M30 46h100M56 18v14M104 18v14"/>' +
        '<path class="il-faint" d="M46 62h14M73 62h14M100 62h14M46 80h14M73 80h14"/>' +
        '<rect class="il-mark" x="98" y="74" width="20" height="12" rx="3"/>',

    'error':
        '<path class="il-paper" d="M80 22l44 76H36z"/>' +
        '<path class="il-line" d="M80 52v22M80 85v.5"/>' +
        '<rect class="il-mark" x="40" y="104" width="80" height="7" rx="3"/>',

    'upload':
        '<rect class="il-paper" x="46" y="16" width="68" height="88" rx="8"/>' +
        '<path class="il-faint" d="M58 34h44M58 44h32"/>' +
        '<rect class="il-mark" x="58" y="54" width="44" height="9" rx="3"/>' +
        '<path class="il-line" d="M80 94V76M72 83l8-8 8 8"/>'
};

function illustration(name)
{
    const body = ILLUSTRATION_BODIES[name];

    if (!body)
    {
        return '';
    }

    return '<svg class="illus" viewBox="0 0 160 120" role="presentation" aria-hidden="true" focusable="false">' + body + '</svg>';
}
