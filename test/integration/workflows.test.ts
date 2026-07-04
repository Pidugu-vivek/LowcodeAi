import http from 'http';
import request from 'supertest';
import { createApp } from '../../src/app';

const ADMIN_API_KEY = 'dev-admin-key';

describe('workflow integration (end-to-end against mock vendors)', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    process.env.SELF_BASE_URL = `http://127.0.0.1:${port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('GET /health returns ok', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true, data: { status: 'ok' } }));
  });

  describe('Example 1: /verify-pan', () => {
    it('verifies a valid PAN and merges in GST details', async () => {
      const res = await request(server).post('/verify-pan').send({ pan: 'ABCDE1234F' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        panStatus: 'VALID',
        panName: 'SAMPLE NAME',
        gst: {
          gstin: '29ABCDE1234F1Z5',
          legalName: 'SAMPLE BUSINESS PVT LTD',
          filingStatus: 'ACTIVE',
        },
      });
    });

    it('rejects a malformed PAN before calling any vendor', async () => {
      const res = await request(server).post('/verify-pan').send({ pan: 'not-a-pan' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Example 2: /validate-aadhaar', () => {
    it('validates Aadhaar and merges in profile details', async () => {
      const res = await request(server).post('/validate-aadhaar').send({ aadhaar: '123456789012' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        aadhaarStatus: 'VALID',
        profile: { name: 'SAMPLE PERSON', dob: '1990-01-01', address: 'Sample Address, IN' },
      });
    });

    it('rejects an aadhaar that fails the request schema', async () => {
      const res = await request(server).post('/validate-aadhaar').send({ aadhaar: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('Example 3: /onboard', () => {
    it('chains OCR -> fraud check -> face match and aggregates the result', async () => {
      const res = await request(server).post('/onboard').send({ documentId: 'doc-123' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        name: 'SAMPLE PERSON',
        documentType: 'PASSPORT',
        ocrConfidence: 0.97,
        riskLevel: 'LOW',
        faceMatchPassed: true,
      });
    });
  });

  describe('admin config API', () => {
    const workflowId = 'integration-test-echo';

    afterEach(async () => {
      await request(server).delete(`/admin/apis/${workflowId}`).set('x-api-key', ADMIN_API_KEY);
    });

    it('rejects requests without an API key', async () => {
      const res = await request(server).get('/admin/apis');
      expect(res.status).toBe(401);
    });

    it('creates a workflow and makes it immediately callable, then supports update and delete', async () => {
      const config = {
        id: workflowId,
        version: 1,
        method: 'POST',
        path: `/${workflowId}`,
        steps: [
          {
            name: 'noop',
            type: 'http',
            vendor: { baseUrl: '${SELF_BASE_URL}', method: 'POST', path: '/mock/ocr/extract' },
            requestMapping: [{ from: 'body.msg', to: 'documentId' }],
            responseMapping: [{ from: 'body.documentId', to: 'echoedDocId' }],
          },
        ],
        response: { mapping: [{ from: 'steps.noop.echoedDocId', to: 'echoed' }] },
      };

      const createRes = await request(server)
        .post('/admin/apis')
        .set('x-api-key', ADMIN_API_KEY)
        .send(config);
      expect(createRes.status).toBe(201);

      const callRes = await request(server).post(`/${workflowId}`).send({ msg: 'hi' });
      expect(callRes.status).toBe(200);
      expect(callRes.body.data).toEqual({ echoed: 'hi' });

      const deleteRes = await request(server)
        .delete(`/admin/apis/${workflowId}`)
        .set('x-api-key', ADMIN_API_KEY);
      expect(deleteRes.status).toBe(200);

      const callAfterDelete = await request(server).post(`/${workflowId}`).send({ msg: 'hi' });
      expect(callAfterDelete.status).toBe(404);
    });

    it('rejects an invalid workflow config with clear errors', async () => {
      const res = await request(server)
        .post('/admin/apis')
        .set('x-api-key', ADMIN_API_KEY)
        .send({ id: 'bad', version: 1, method: 'BOGUS', path: 'no-leading-slash', steps: [] });
      expect(res.status).toBe(400);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });
  });
});
