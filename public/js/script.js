document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input')
  const searchBtn = document.getElementById('search-btn')
  const imagesContainer = document.getElementById('images-container')
  const prevButton = document.getElementById('prev-page')
  const nextButton = document.getElementById('next-page')
  const currentPageSpan = document.getElementById('current-page')
  const totalPagesSpan = document.getElementById('total-pages')

  let currentPage = 1
  let totalPages = 1

  const showError = (message) => {
    imagesContainer.innerHTML = `<div class="error-message">${message}</div>`
  }

  const fetchImages = async (page, query = '') => {
    try {
      const response = await fetch(
        `/api/images?q=${encodeURIComponent(query)}&page=${page}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch images')
      }

      const data = await response.json()

      totalPages = data.totalPages
      currentPageSpan.textContent = page
      totalPagesSpan.textContent = totalPages

      // Update pagination buttons state
      prevButton.disabled = currentPage <= 1
      nextButton.disabled = currentPage >= totalPages

      if (data.images.length === 0) {
        imagesContainer.innerHTML =
          '<div class="no-results">No images found</div>'
        return
      }

      imagesContainer.innerHTML = data.images
        .map(
          (img) => `
                    <div class="image-card">
                        <img src="${img.url}" alt="${img.name}" loading="lazy">
                        <div class="image-info">
                            <span class="image-name">${img.name}</span>
                        </div>
                    </div>
                `
        )
        .join('')
    } catch (error) {
      showError('Error loading images. Please try again later.')
      console.error('Error:', error)
    }
  }

  // Search functionality
  const handleSearch = () => {
    currentPage = 1
    fetchImages(currentPage, searchInput.value)
  }

  searchBtn.addEventListener('click', handleSearch)
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  })

  // Pagination
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--
      fetchImages(currentPage, searchInput.value)
    }
  })

  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++
      fetchImages(currentPage, searchInput.value)
    }
  })

  // Initialize the gallery
  fetchImages(currentPage)
})
