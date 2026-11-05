(function ()
{
    const baseHandle = MockApi.handle;
    const MAX_BYTES = 5 * 1024 * 1024;

    let profile =
    {
        name: 'Ali Candidate',
        email: 'candidate@test.com',
        phone: '+92 300 5550101',
        skills: [
            { skill: 'Python', verified: true },
            { skill: 'Django', verified: true },
            { skill: 'Docker', verified: false },
            { skill: 'Kubernetes', verified: false }
        ],
        education: ['BS Computer Science, FAST NUCES Lahore, 2026'],
        experience: ['Backend Intern, Tech Solutions, 6 months: built REST APIs in Django'],
        projects: ['Job Board API: Django REST service with PostgreSQL', 'Chat App: real-time chat using WebSockets']
    };

    function pause()
    {
        return new Promise(function (resolve)
        {
            setTimeout(resolve, 900);
        });
    }

    MockApi.handle = async function (method, path, body, token)
    {
        const route = path.split('?')[0];

        if (method === 'POST' && route === '/api/applications')
        {
            await pause();
            MockApi.requireUser(MockApi.userFromToken(token), 'candidate');

            const file = body instanceof FormData ? body.get('resume') : null;
            const jobId = Number(body instanceof FormData ? body.get('jobId') : 0);

            if (!file || !file.size)
            {
                MockApi.fail(400, 'Please choose your resume PDF.');
            }

            if (file.type !== 'application/pdf')
            {
                MockApi.fail(415, 'Only PDF files are accepted. Please export your resume as a PDF.');
            }

            if (file.size > MAX_BYTES)
            {
                MockApi.fail(413, 'This file is larger than 5 MB. Please upload a smaller PDF.');
            }

            const job = MOCK_JOBS.filter(function (item) { return item.id === jobId; })[0];

            if (!job || job.status !== 'open')
            {
                MockApi.fail(400, 'This job is closed and no longer accepts applications.');
            }

            const already = MOCK_CANDIDATE_APPLICATIONS.some(function (item) { return item.jobId === jobId; });

            if (already)
            {
                MockApi.fail(409, 'You have already applied to this job.');
            }

            const now = new Date().toISOString();
            const application = { id: Date.now(), jobId: jobId, jobTitle: job.title, status: 'Submitted', appliedAt: now, timeline: [{ status: 'Submitted', at: now }] };
            MOCK_CANDIDATE_APPLICATIONS.unshift(application);
            job.applicantCount = (job.applicantCount || 0) + 1;
            return { id: application.id, status: 'Submitted' };
        }

        if (route === '/api/candidate/profile')
        {
            await pause();
            MockApi.requireUser(MockApi.userFromToken(token), 'candidate');

            if (method === 'GET')
            {
                return MockApi.clone(profile);
            }

            if (method === 'PUT')
            {
                if (!body || !Array.isArray(body.skills))
                {
                    MockApi.fail(400, 'Your profile could not be saved. Please check the fields and try again.');
                }

                profile = MockApi.clone(body);
                return MockApi.clone(profile);
            }
        }

        return baseHandle.call(MockApi, method, path, body, token);
    };
})();