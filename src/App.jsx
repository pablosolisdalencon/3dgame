import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import Scene from './Scene.jsx'
import HUD from './components/ui/HUD.jsx'
import InventoryUI from './components/ui/InventoryUI.jsx' // Import InventoryUI
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        <Scene />
        <Stats />
      </Canvas>
      <HUD />
      <InventoryUI /> {/* Render Inventory UI overlay */}
    </div>
  )
}

export default App
