(function ()
{
    const baseHandle = MockApi.handle;
    const KNOWN_SKILLS = ['Python', 'Django', 'Flask', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes', 'REST APIs', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'HTML', 'CSS', 'SQL', 'Excel', 'AWS', 'Git', 'Java'];

    function pause()
    {
        return new Promise(function (resolve)
        {
            setTimeout(resolve, 600);
        });
    }

    function findJob(id)
    {
        for (let i = 0; i < MOCK_JOBS.length; i++)
        {
            if (MOCK_JOBS[i].id === Number(id))
            {
                return MOCK_JOBS[i];
            }
        }

        MockApi.fail(404, 'This job could not be found.');
    }

    function requireTitle(body)
    {
        if (!body || !String(body.title || '').trim())
        {
            MockApi.fail(400, 'Please enter a job title.');
        }
    }

    function extractSkills(description)
    {
        const text = String(description || '').toLowerCase();
        const found = KNOWN_SKILLS.filter(function (skill)
        {
            return text.indexOf(skill.toLowerCase()) !== -1;
        });

        return found.map(function (skill, index)
        {
            return {
                skill: skill,
                requirement: index < 3 ? 'required' : 'preferred',
                importance: index < 2 ? 'high' : 'medium'
            };
        });
    }

    MockApi.handle = async function (method, path, body, token)
    {
        const route = path.split('?')[0];
        let match = null;

        if (method === 'POST' && route === '/api/jobs')
        {
            await pause();
            MockApi.requireUser(MockApi.userFromToken(token), 'recruiter');
            requireTitle(body);

            const ids = MOCK_JOBS.map(function (job) { return job.id; });
            const job = Object.assign({}, body, { id: Math.max.apply(null, ids) + 1, status: 'open', applicantCount: 0 });
            MOCK_JOBS.unshift(job);
            return MockApi.clone(job);
        }

        if (method === 'POST' && route === '/api/jobs/extract-requirements')
        {
            await pause();
            MockApi.requireUser(MockApi.userFromToken(token), 'recruiter');

            if (!body || String(body.description || '').trim().length < 20)
            {
                MockApi.fail(400, 'Please write a longer job description so the AI has something to read.');
            }

            return { skills: extractSkills(body.description) };
        }

        match = route.match(/^\/api\/jobs\/(\d+)$/);

        if (method === 'PUT' && match)
        {
            await pause();
            MockApi.requireUser(MockApi.userFromToken(token), 'recruiter');
            requireTitle(body);
            const job = findJob(match[1]);
            Object.assign(job, body, { id: job.id, status: job.status, applicantCount: job.applicantCount });
            return MockApi.clone(job);
        }

        match = route.match(/^\/api\/jobs\/(\d+)\/(close|reopen)$/);

        if (method === 'PATCH' && match)
        {
            await pause();
            MockApi.requireUser(MockApi.userFromToken(token), 'recruiter');
            const job = findJob(match[1]);
            job.status = match[2] === 'close' ? 'closed' : 'open';
            return MockApi.clone(job);
        }

        return baseHandle.call(MockApi, method, path, body, token);
    };
})();