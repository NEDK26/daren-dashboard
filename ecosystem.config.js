module.exports = {
  apps: [{
    name: 'daren-dashboard',
    script: 'server.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '300M'
  }]
};
