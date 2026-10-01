import PocketBase from 'pocketbase'

// No modo local desktop (file:// ou sem internet), URL pode ser vazia ou localhost
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'
const pb = new PocketBase(pbUrl)
pb.autoCancellation(false)

export default pb
