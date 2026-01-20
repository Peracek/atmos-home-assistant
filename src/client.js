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

  extractViewState(xmlResponse) {
    const match = xmlResponse.match(
      /<update[^>]*id="[^"]*jakarta\.faces\.ViewState[^"]*"[^>]*><!\[CDATA\[([^\]]+)\]\]><\/update>/
    );
    if (match && match[1]) {
      this.viewState = match[1];
    }
  }

  buildCookieHeader() {
    return this.sessionId ? `JSESSIONID=${this.sessionId}` : '';
  }

  async post(endpoint, params, isAjax = false) {
    const url = `${BASE_URL}${endpoint}?jfwid=${this.clientWindow}`;
    const body = new URLSearchParams(params).toString();

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/xml, text/xml, */*; q=0.01',
      'User-Agent': 'AtmosHistoryCli/1.0',
    };

    if (isAjax) {
      headers['Faces-Request'] = 'partial/ajax';
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    const cookie = this.buildCookieHeader();
    if (cookie) headers['Cookie'] = cookie;

    const response = await this.axios.post(url, body, { headers });
    this.extractCookies(response);

    if (response.status === 302) return 'REDIRECT';
    return response.data;
  }

  async login(username, password) {
    const params = {
      'fLogin:userNameId': username,
      'fLogin:passwordId': password,
      'fLogin:j_id_1l': '',
      'fLogin_SUBMIT': '1',
      'jakarta.faces.ViewState': 'stateless',
      'jakarta.faces.ClientWindow': this.clientWindow,
    };

    const response = await this.post('/login.html', params, false);

    if (response === 'REDIRECT' && this.sessionId) {
      return true;
    }
    throw new Error('Login failed: Invalid credentials');
  }

  async navigateToInfo() {
    const params = {
      'jakarta.faces.partial.ajax': 'true',
      'jakarta.faces.source': 'fDeviceHome:j_id_7y',
      'jakarta.faces.partial.render': 'fDeviceHome',
      'fDeviceHome_SUBMIT': '1',
      'jakarta.faces.ViewState': this.viewState,
      'jakarta.faces.ClientWindow': this.clientWindow,
    };

    const response = await this.post('/appl/devicehome.html', params, true);
    this.extractViewState(response);
    return response;
  }

  async pollTemperatures() {
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
    this.extractViewState(response);
    return response;
  }
}
