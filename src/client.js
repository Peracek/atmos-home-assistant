import axios from 'axios';

const BASE_URL = 'https://cloud.atmos.eu';

export class AtmosClient {
  constructor() {
    this.sessionId = null;
    this.clientWindow = this.generateClientWindow();
    this.viewState = 'stateless';

    this.axios = axios.create({
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: (status) => status < 400 || status === 302,
    });
  }

  generateClientWindow() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '-';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  extractCookies(response) {
    const setCookie = response.headers['set-cookie'];
    if (!setCookie) return;

    for (const cookie of setCookie) {
      if (cookie.startsWith('JSESSIONID=')) {
        const match = cookie.match(/JSESSIONID=([^;]+)/);
        if (match) this.sessionId = match[1];
      }
    }
  }

  extractViewStateFromXml(xmlResponse) {
    const match = xmlResponse.match(
      /<update[^>]*id="[^"]*jakarta\.faces\.ViewState[^"]*"[^>]*><!\[CDATA\[([^\]]+)\]\]><\/update>/
    );
    if (match && match[1]) {
      this.viewState = match[1];
    }
  }

  extractViewStateFromHtml(html) {
    // Look for hidden input with ViewState
    const match = html.match(/name="jakarta\.faces\.ViewState"[^>]*value="([^"]+)"/);
    if (match && match[1]) {
      this.viewState = match[1];
    }
  }

  buildCookieHeader() {
    return this.sessionId ? `JSESSIONID=${this.sessionId}` : '';
  }

  async get(endpoint) {
    const url = `${BASE_URL}${endpoint}?jfwid=${this.clientWindow}`;

    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const cookie = this.buildCookieHeader();
    if (cookie) headers['Cookie'] = cookie;

    const response = await this.axios.get(url, { headers });
    this.extractCookies(response);

    return response.data;
  }

  async post(endpoint, params, isAjax = false) {
    const url = `${BASE_URL}${endpoint}?jfwid=${this.clientWindow}`;
    const body = new URLSearchParams(params).toString();

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': isAjax ? 'application/xml, text/xml, */*; q=0.01' : 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    if (isAjax) {
      headers['Faces-Request'] = 'partial/ajax';
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    const cookie = this.buildCookieHeader();
    if (cookie) headers['Cookie'] = cookie;

    const response = await this.axios.post(url, body, { headers });
    this.extractCookies(response);

    if (response.status === 302) {
      return { redirect: true, location: response.headers['location'] };
    }
    return { redirect: false, data: response.data };
  }

  async login(username, password) {
    // First, load the login page to get initial ViewState
    const loginPage = await this.get('/login.html');
    this.extractViewStateFromHtml(loginPage);

    const params = {
      'fLogin:userNameId': username,
      'fLogin:passwordId': password,
      'fLogin:j_id_1l': '',
      'fLogin_SUBMIT': '1',
      'jakarta.faces.ViewState': this.viewState,
      'jakarta.faces.ClientWindow': this.clientWindow,
    };

    const response = await this.post('/login.html', params, false);

    if (response.redirect && this.sessionId) {
      // Follow redirect to establish session - load the target page
      const targetPath = response.location || '/appl/devicehome.html';
      const homePage = await this.get(targetPath);
      this.extractViewStateFromHtml(homePage);
      return true;
    }
    throw new Error('Login failed: Invalid credentials');
  }

  async pollTemperatures() {
    // Use the home page poll to get temperature data
    const params = {
      'jakarta.faces.partial.ajax': 'true',
      'jakarta.faces.source': 'fDeviceHome:homePageDataPollId',
      'jakarta.faces.partial.execute': 'fDeviceHome:homePageDataPollId',
      'jakarta.faces.partial.render': 'fDeviceHome:homePartId',
      'fDeviceHome_SUBMIT': '1',
      'jakarta.faces.ViewState': this.viewState,
      'jakarta.faces.ClientWindow': this.clientWindow,
    };

    const response = await this.post('/appl/devicehome.html', params, true);
    if (!response.redirect) {
      this.extractViewStateFromXml(response.data);
      return response.data;
    }
    throw new Error('Session expired - redirected to login');
  }
}
