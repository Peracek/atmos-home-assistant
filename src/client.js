import axios from 'axios';

const BASE_URL = 'https://cloud.atmos.eu';

export class AtmosClient {
  constructor() {
    this.sessionId = null;
    this.clientWindow = this.generateClientWindow();
    this.viewState = 'stateless';
    this.onInfoPage = false;

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
      const targetPath = response.location || '/appl/devicehome.html';
      const homePage = await this.get(targetPath);
      this.extractViewStateFromHtml(homePage);
      return true;
    }
    throw new Error('Login failed: Invalid credentials');
  }

  // Check if device is connected (no "Waiting for data" warning)
  isDeviceConnected(xml) {
    // Check if warning panel is empty or doesn't contain "Čekání na data"
    return !xml.includes('Čekání na data') && !xml.includes('deviceWaiting4Data');
  }

  // Poll home page and check connection status
  async pollHomePage() {
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

  // Reload the home page (full page load, not AJAX)
  async reloadHomePage() {
    const homePage = await this.get('/appl/devicehome.html');
    this.extractViewStateFromHtml(homePage);
    return homePage;
  }

  // Wait for device to connect (max 10 seconds)
  // Reloads the page when "Waiting for data" warning is present
  async waitForConnection(maxWaitMs = 10000, reloadIntervalMs = 2000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const html = await this.reloadHomePage();
      if (this.isDeviceConnected(html)) {
        return true;
      }
      console.log('Device waiting for data, reloading...');
      await new Promise(r => setTimeout(r, reloadIntervalMs));
    }

    return false; // Timeout - device still not connected
  }

  // Navigate to Info page by clicking the Info button
  async navigateToInfo() {
    const params = {
      'jakarta.faces.partial.ajax': 'true',
      'jakarta.faces.source': 'fDeviceHome:j_id_4q',
      'jakarta.faces.partial.execute': '@all',
      'jakarta.faces.partial.render': 'fDeviceHome',
      'fDeviceHome:j_id_4q': 'fDeviceHome:j_id_4q',
      'fDeviceHome_SUBMIT': '1',
      'jakarta.faces.ViewState': this.viewState,
      'jakarta.faces.ClientWindow': this.clientWindow,
    };

    const response = await this.post('/appl/devicehome.html', params, true);
    if (!response.redirect) {
      this.extractViewStateFromXml(response.data);
      this.onInfoPage = true;
      return response.data;
    }
    throw new Error('Session expired - redirected to login');
  }

  // Poll Info page for detailed sensor data
  async pollInfoPage() {
    const params = {
      'jakarta.faces.partial.ajax': 'true',
      'jakarta.faces.source': 'fDeviceHome:pollReloadInfo',
      'jakarta.faces.partial.execute': 'fDeviceHome:pollReloadInfo',
      'jakarta.faces.partial.render': 'fDeviceHome:infoPanel',
      'fDeviceHome:pollReloadInfo': 'fDeviceHome:pollReloadInfo',
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

  // Main poll method - uses Info page if available, falls back to home page
  async pollTemperatures() {
    if (this.onInfoPage) {
      return this.pollInfoPage();
    }
    return this.pollHomePage();
  }
}
