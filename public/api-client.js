(function registerDarenApi(global) {
  global.DAREN_API = Object.freeze({
    get: (url, options = {}) => fetch(url, options).then(response => response.json()),
    post: (url, data) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(response => response.json()),
    put: (url, data) => fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(response => response.json()),
    delete: (url, data) => fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(response => response.json()),
    upload: (url, file, fields = {}) => {
      const formData = new FormData();
      if (file) formData.append('file', file);
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
      return fetch(url, { method: 'POST', body: formData }).then(response => response.json());
    }
  });
})(window);

