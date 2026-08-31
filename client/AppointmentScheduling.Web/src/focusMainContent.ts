export function focusMainContent() {
  const mainContent = document.getElementById('main-content')

  if (mainContent === null) {
    return
  }

  mainContent.classList.add('nhsuk-skip-link-focused-element')
  mainContent.addEventListener(
    'blur',
    () => mainContent.classList.remove('nhsuk-skip-link-focused-element'),
    { once: true },
  )
  mainContent.focus()
}
