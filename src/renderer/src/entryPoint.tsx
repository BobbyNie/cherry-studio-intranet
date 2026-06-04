import './assets/styles/index.css'
import './assets/styles/tailwind.css'
import '@ant-design/v5-patch-for-react-19'

import { createRoot } from 'react-dom/client'

import App from './App'
import { registerIconifyCollections } from './components/Icons/registerIconifyCollections'
registerIconifyCollections()

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
