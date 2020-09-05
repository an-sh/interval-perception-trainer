module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      mainProcessWatch: ['src/models/**', 'src/services/main/**',  'src/services/shared/**'],
    }
  }
}
