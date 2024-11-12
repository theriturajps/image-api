const fs = require('fs')
const path = require('path')

const assetsPath = path.join(__dirname, 'assets')

fs.readdir(assetsPath, (err, files) => {
  if (err) {
    console.error('Error reading assets folder:', err)
    return
  }

  files.forEach((file) => {
    const newFileName = file.replace(/\s+/g, '_')
    fs.rename(
      path.join(assetsPath, file),
      path.join(assetsPath, newFileName),
      (renameErr) => {
        if (renameErr) console.error(`Error renaming file ${file}:`, renameErr)
        else console.log(`Renamed ${file} to ${newFileName}`)
      }
    )
  })
})
