import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei' // Import Stats
import Scene from './Scene'
import './App.css'

function App() {
  return (
    <Canvas style={{ width: '100vw', height: '100vh' }}>
      <Scene />
      <Stats /> {/* Add Stats component */}
    </Canvas>
  )
}

export default App
