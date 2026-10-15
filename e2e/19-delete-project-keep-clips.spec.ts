import { test, expect } from '@playwright/test';

// Deleting a project with "keep clips" moves its clips (and its sub-projects' clips) to another project
// before anything is deleted. Before this, the moves were never awaited and the server ignored them, so the
// clips were deleted with the project. Works on API calls, with its own data, cleaned up afterwards.
test.describe('19. Delete a project but keep its clips', () => {
  const stamp = Date.now();
  const made: string[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of made) await request.delete(`/api/projects?id=${id}`);
  });

  async function makeProject(request: any, title: string, parentId?: string) {
    const res = await request.post('/api/projects', { data: { title: `${title} ${stamp}`, parentId } });
    expect(res.ok()).toBeTruthy();
    const id = (await res.json()).data.id as string;
    made.push(id);
    return id;
  }

  async function makeAtom(request: any, projectId: string, title: string) {
    const res = await request.post('/api/atoms', {
      data: { projectId, type: 'note', title: `${title} ${stamp}`, content: { text: title }, metadata: { sourceUrl: 'https://example.org/k', pageTitle: 'k' } },
    });
    expect(res.ok()).toBeTruthy();
    return (await res.json()).data.id as string;
  }

  const idsIn = async (request: any, projectId: string) =>
    (((await (await request.get(`/api/atoms?projectId=${projectId}`)).json()).data || []) as any[]).map((a) => a.id);

  test('moveTo keeps the clips of the project and of its sub-project, and removes both projects', async ({ request }) => {
    const keep = await makeProject(request, 'keep target');
    const parent = await makeProject(request, 'doomed parent');
    const child = await makeProject(request, 'doomed child', parent);
    const a1 = await makeAtom(request, parent, 'parent clip');
    const a2 = await makeAtom(request, child, 'child clip');

    const res = await request.delete(`/api/projects?id=${parent}&moveTo=${keep}`);
    expect(res.ok()).toBeTruthy();

    const kept = await idsIn(request, keep);
    expect(kept).toContain(a1);
    expect(kept).toContain(a2);
    const projects = ((await (await request.get('/api/projects')).json()).data || []) as any[];
    expect(projects.some((p) => p.id === parent || p.id === child)).toBe(false);
  });

  test('a target inside the deleted project is refused and nothing is lost', async ({ request }) => {
    const parent = await makeProject(request, 'refuse parent');
    const child = await makeProject(request, 'refuse child', parent);
    const a1 = await makeAtom(request, parent, 'stays');
    const res = await request.delete(`/api/projects?id=${parent}&moveTo=${child}`);
    expect(res.status()).toBe(400);
    expect(await idsIn(request, parent)).toContain(a1);
  });

  test('without moveTo the clips are deleted with the project', async ({ request }) => {
    const gone = await makeProject(request, 'plain delete');
    const a1 = await makeAtom(request, gone, 'goes');
    expect((await request.delete(`/api/projects?id=${gone}`)).ok()).toBeTruthy();
    const all = ((await (await request.get('/api/atoms')).json()).data || []) as any[];
    expect(all.some((a) => a.id === a1)).toBe(false);
  });
});
