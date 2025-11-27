const summaryEl = document.getElementById('summary');
const summaryStatus = document.getElementById('summaryStatus');
const namespaceInput = document.getElementById('namespace');
const jobsEl = document.getElementById('jobs');
const toastEl = document.getElementById('toast');

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const showToast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
};

const statusBadge = (status) => {
  switch (status) {
    case 'succeeded':
      return 'badge badge--success';
    case 'failed':
      return 'badge badge--danger';
    case 'running':
      return 'badge badge--warn';
    default:
      return 'badge badge--outline';
  }
};

const formatTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString();
};

const renderSummary = (summary) => {
  if (!summary || !summary.deployments || !summary.deployments.length) {
    summaryEl.innerHTML =
      '<p class="muted">No deployments reported in this namespace.</p>';
    return;
  }

  const cards = summary.deployments
    .map((deploy) => {
      const healthy =
        deploy.readyReplicas === deploy.desiredReplicas &&
        deploy.desiredReplicas > 0;
      const badge = healthy
        ? '<span class="badge badge--success">healthy</span>'
        : '<span class="badge badge--warn">needs attention</span>';

      return `
        <div class="summary-card">
          <div class="summary-meta">
            <span>${escapeHtml(deploy.name)}</span>
            ${badge}
          </div>
          <h3>${escapeHtml(deploy.readyReplicas)} / ${escapeHtml(
        deploy.desiredReplicas
      )} ready</h3>
          <p class="meta">Images: ${
            deploy.images && deploy.images.length
              ? escapeHtml(deploy.images.join(', '))
              : 'n/a'
          }</p>
        </div>
      `;
    })
    .join('');

  summaryEl.innerHTML = cards;
};

const fetchSummary = async () => {
  const namespace = namespaceInput.value || 'estatewise';
  summaryStatus.textContent = `Loading ${namespace}…`;
  try {
    const res = await fetch(
      `/api/cluster/summary?namespace=${encodeURIComponent(namespace)}`
    );
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const data = await res.json();
    summaryStatus.textContent = `Updated ${new Date(
      data.timestamp
    ).toLocaleTimeString()} · ${data.namespace}`;
    renderSummary(data);
  } catch (error) {
    summaryStatus.textContent = 'Unable to read cluster';
    showToast('Failed to load cluster summary. Check kubectl context.');
    summaryEl.innerHTML =
      '<p class="muted">Cluster data unavailable. Verify kubectl context.</p>';
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

const renderJobs = (jobs) => {
  if (!jobs || !jobs.length) {
    jobsEl.innerHTML =
      '<p class="muted">No jobs yet. Kick off a deployment to see activity.</p>';
    return;
  }

  jobsEl.innerHTML = '';

  jobs.forEach((job) => {
    const jobEl = document.createElement('div');
    jobEl.className = 'job';

    const header = document.createElement('div');
    header.className = 'job__header';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${escapeHtml(
      job.description
    )}</strong><div class="meta">${escapeHtml(job.command)}</div>`;

    const badge = document.createElement('span');
    badge.className = statusBadge(job.status);
    badge.textContent = job.status;

    header.appendChild(title);
    header.appendChild(badge);

    const meta = document.createElement('div');
    meta.className = 'job__meta';
    meta.innerHTML = `
      <span>Started: ${escapeHtml(formatTime(job.startedAt))}</span>
      <span>Finished: ${escapeHtml(formatTime(job.finishedAt))}</span>
      <span>Exit: ${job.exitCode === null || job.exitCode === undefined ? '—' : escapeHtml(job.exitCode)}</span>
    `;

    const params =
      job.parameters && Object.keys(job.parameters).length
        ? `<div class="meta">Params: ${escapeHtml(
            JSON.stringify(job.parameters)
          )}</div>`
        : '';

    const logs = document.createElement('pre');
    logs.className = 'job__logs';
    const output =
      job.output && job.output.length
        ? job.output.join('\n').trim()
        : 'Waiting for output…';
    logs.textContent = output;

    jobEl.appendChild(header);
    jobEl.appendChild(meta);
    if (params) {
      const paramsEl = document.createElement('div');
      paramsEl.className = 'meta';
      paramsEl.textContent = `Params: ${JSON.stringify(job.parameters)}`;
      jobEl.appendChild(paramsEl);
    }
    jobEl.appendChild(logs);
    jobsEl.appendChild(jobEl);
  });
};

const fetchJobs = async () => {
  try {
    const res = await fetch('/api/jobs');
    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = await res.json();
    renderJobs(data.jobs || []);
  } catch (error) {
    showToast('Could not load job feed.');
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

const submitJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

document.getElementById('blueGreenForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const payload = {
    image: formData.get('image'),
    serviceName: formData.get('serviceName') || 'backend',
    namespace: formData.get('namespace') || namespaceInput.value || 'estatewise',
    autoSwitch: formData.get('autoSwitch') === 'on',
    smokeTest: formData.get('smokeTest') === 'on',
    scaleDownOld: formData.get('scaleDownOld') === 'on',
  };

  try {
    await submitJson('/api/deploy/blue-green', payload);
    showToast('Blue/Green deployment kicked off.');
    fetchJobs();
  } catch (error) {
    showToast('Failed to start Blue/Green.');
    // eslint-disable-next-line no-console
    console.error(error);
  }
});

document.getElementById('canaryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = {
    image: formData.get('image'),
    serviceName: formData.get('serviceName') || 'backend',
    namespace: formData.get('namespace') || namespaceInput.value || 'estatewise',
    canaryStages: formData.get('canaryStages') || '10,25,50,75,100',
    stageDuration: Number(formData.get('stageDuration') || 120),
    autoPromote: formData.get('autoPromote') === 'on',
    enableMetrics: formData.get('enableMetrics') === 'on',
    canaryReplicasStart: Number(formData.get('canaryReplicasStart') || 1),
    stableReplicas: Number(formData.get('stableReplicas') || 2),
  };

  try {
    await submitJson('/api/deploy/canary', payload);
    showToast('Canary deployment started.');
    fetchJobs();
  } catch (error) {
    showToast('Failed to start canary deployment.');
    // eslint-disable-next-line no-console
    console.error(error);
  }
});

document.getElementById('rollingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = {
    serviceName: formData.get('serviceName') || 'backend',
    namespace: formData.get('namespace') || namespaceInput.value || 'estatewise',
  };

  try {
    await submitJson('/api/deploy/rolling', payload);
    showToast('Rolling restart kicked off.');
    fetchJobs();
  } catch (error) {
    showToast('Rolling restart failed to start.');
    // eslint-disable-next-line no-console
    console.error(error);
  }
});

document.getElementById('scaleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const replicas = Number(formData.get('replicas'));
  if (Number.isNaN(replicas)) {
    showToast('Replicas must be a number.');
    return;
  }

  const payload = {
    serviceName: formData.get('serviceName') || 'backend',
    namespace: namespaceInput.value || 'estatewise',
    replicas,
    variant: formData.get('variant') || undefined,
  };

  try {
    await submitJson('/api/ops/scale', payload);
    showToast('Scaling request sent.');
    fetchJobs();
  } catch (error) {
    showToast('Failed to scale deployment.');
    // eslint-disable-next-line no-console
    console.error(error);
  }
});

document
  .getElementById('refreshSummary')
  .addEventListener('click', fetchSummary);
document
  .getElementById('refreshSummarySecondary')
  .addEventListener('click', fetchSummary);
document.getElementById('refreshJobs').addEventListener('click', fetchJobs);

fetchJobs();
fetchSummary();
setInterval(fetchJobs, 6000);
