export function formatBookingStatus(status: 'Active' | 'Cancelled') {
  return status === 'Active' ? 'Confirmed' : 'Cancelled'
}
