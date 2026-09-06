import './assets/styles/index.css'
import './assets/styles/tailwind.css'
import '@ant-design/v5-patch-for-react-19'

import { createRoot } from 'react-dom/client'

import App from './App'
import { registerIconifyCollections } from './components/Icons/registerIconifyCollections'
<<<<<<< HEAD

=======
>>>>>>> 6b6931d0d3692a7e60bad52c1e5f6437632b9508
registerIconifyCollections()

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
