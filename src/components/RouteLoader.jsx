export default function RouteLoader() {
  return (
    <div className="route-loader" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>Loading FloodSense...</span>
    </div>
  )
}
