(function ()
{
    const baseHandle = MockApi.handle;

    MockApi.handle = async function (method, path, body, token)
    {
        const match = path.split('?')[0].match(/^\/api\/applications\/(\d+)\/override$/);

        if (method === 'PATCH' && match)
        {
            await new Promise(function (resolve) { setTimeout(resolve, 500); });
            MockApi.requireUser(MockApi.userFromToken(token), 'recruiter');

            const score = body ? Number(body.score) : NaN;
            const reason = body ? String(body.reason || '').trim() : '';

            if (isNaN(score) || score < 0 || score > 100)
            {
                MockApi.fail(400, 'Enter a score between 0 and 100.');
            }

            if (reason.length < 5)
            {
                MockApi.fail(400, 'Please give a reason for the override (at least 5 characters).');
            }

            const applicant = MOCK_APPLICANTS.filter(function (item) { return item.id === Number(match[1]); })[0];

            if (!applicant)
            {
                MockApi.fail(404, 'This applicant could not be found.');
            }

            applicant.overrideScore = score;
            applicant.overrideReason = reason;
            return MockApi.clone(applicant);
        }

        return baseHandle.call(MockApi, method, path, body, token);
    };
})();