const http = require('http')
const fs = require('fs').promises
const path = require('path')
const url = require('url')

// Configuration
const PORT = process.env.PORT || 3000
const ITEMS_PER_PAGE = 6
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png']

// Helper Functions
const sendJsonResponse = (res, data, statusCode = 200) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

const sendErrorResponse = (res, error, statusCode = 500) => {
  console.error('Error:', error)
  sendJsonResponse(
    res,
    { error: error.message || 'Internal server error' },
    statusCode
  )
}

const getContentType = (extname) => {
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  }
  return contentTypes[extname] || 'text/plain'
}

// Route Handlers
const handleStaticFile = async (req, res, urlPath) => {
  try {
    // Remove leading slash and map to public directory
    const relativePath = urlPath.replace(/^\//, '')
    let filePath

    if (relativePath === '') {
      // Serve index.html for root path
      filePath = path.join(__dirname, 'public', 'index.html')
    } else if (relativePath.startsWith('assets/')) {
      // Serve files from assets directory
      filePath = path.join(__dirname, relativePath)
    } else {
      // Serve other static files from public directory
      filePath = path.join(__dirname, 'public', relativePath)
    }

    const content = await fs.readFile(filePath)
    const contentType = getContentType(path.extname(filePath))

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    })
    res.end(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`File not found: ${urlPath}`)
      sendErrorResponse(res, new Error('File not found'), 404)
    } else {
      sendErrorResponse(res, error)
    }
  }
}

const handleImageList = async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true)
    const page = Math.max(1, parseInt(parsedUrl.query.page) || 1)
    const searchTerm = (parsedUrl.query.q || '').toLowerCase()

    const files = await fs.readdir(path.join(__dirname, 'assets'))

    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase()
      return (
        SUPPORTED_FORMATS.includes(ext) &&
        (!searchTerm || file.toLowerCase().includes(searchTerm))
      )
    })

    const totalPages = Math.ceil(imageFiles.length / ITEMS_PER_PAGE)
    const start = (page - 1) * ITEMS_PER_PAGE
    const paginatedFiles = imageFiles.slice(start, start + ITEMS_PER_PAGE)

    const images = await Promise.all(
      paginatedFiles.map(async (filename) => {
        const stats = await fs.stat(path.join(__dirname, 'assets', filename))
        return {
          name: filename,
          url: `/assets/${filename}`,
          size: stats.size,
          modified: stats.mtime,
        }
      })
    )

    sendJsonResponse(res, {
      images,
      currentPage: page,
      totalPages,
      totalImages: imageFiles.length,
    })
  } catch (error) {
    sendErrorResponse(res, error)
  }
}

const handleRandomImage = async (req, res) => {
  try {
    const files = await fs.readdir(path.join(__dirname, 'assets'))
    const imageFiles = files.filter((file) =>
      SUPPORTED_FORMATS.includes(path.extname(file).toLowerCase())
    )

    if (imageFiles.length === 0) {
      sendErrorResponse(res, new Error('No images found'), 404)
      return
    }

    const randomImage =
      imageFiles[Math.floor(Math.random() * imageFiles.length)]
    const stats = await fs.stat(path.join(__dirname, 'assets', randomImage))

    sendJsonResponse(res, {
      name: randomImage,
      url: `/assets/${randomImage}`,
      size: stats.size,
      modified: stats.mtime,
    })
  } catch (error) {
    sendErrorResponse(res, error)
  }
}

// Create Server
const server = http.createServer(async (req, res) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      })
      res.end()
      return
    }

    if (req.method !== 'GET') {
      sendErrorResponse(res, new Error('Method not allowed'), 405)
      return
    }

    const parsedUrl = url.parse(req.url, true)
    const pathname = parsedUrl.pathname

    // API Routes
    if (pathname === '/api/images') {
      await handleImageList(req, res)
    } else if (pathname === '/api/image/random') {
      await handleRandomImage(req, res)
    } else {
      // Static file handling
      await handleStaticFile(req, res, pathname)
    }
  } catch (error) {
    sendErrorResponse(res, error)
  }
})

// Create required directories if they don't exist
const initializeDirectories = async () => {
  try {
    // Create assets directory
    await fs.mkdir(path.join(__dirname, 'assets')).catch(() => {})

    // Create public directory and its subdirectories
    await fs.mkdir(path.join(__dirname, 'public')).catch(() => {})
    await fs.mkdir(path.join(__dirname, 'public', 'css')).catch(() => {})
    await fs.mkdir(path.join(__dirname, 'public', 'js')).catch(() => {})

    console.log('Directories initialized successfully')
  } catch (error) {
    console.error('Error creating directories:', error)
  }
}

// Start server
const startServer = async () => {
  await initializeDirectories()

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
    console.log(`Serving images from: ${path.join(__dirname, 'assets')}`)
    console.log(`Serving static files from: ${path.join(__dirname, 'public')}`)
  })
}

startServer()

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Please try a different port.`
    )
  } else {
    console.error('Server error:', error)
  }
  process.exit(1)
})
