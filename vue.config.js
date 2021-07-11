module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      contextIsolation: false,
      mainProcessWatch: ['src/models/**', 'src/services/main/**',  'src/services/shared/**'],
    }
  }
}
