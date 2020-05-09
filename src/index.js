import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math'

import { ActionManager } from '@babylonjs/core/Actions/actionManager'
import {Engine} from '@babylonjs/core/Engines/engine'
import { ExecuteCodeAction } from '@babylonjs/core/Actions'
import {FollowCamera} from '@babylonjs/core/Cameras/followCamera'
import {GrassProceduralTexture} from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { Scene } from '@babylonjs/core/scene'
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial'

const msg = document.getElementById('status-msg')
const canvas = document.getElementById('renderCanvas')
const engine = new Engine(canvas)
window.addEventListener('resize', e => engine.resize())
let scene = new Scene(engine)

let keys = {}
scene.actionManager = new ActionManager(scene)
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => {
  keys[e.sourceEvent.key] = true
  if (e.sourceEvent.key === 'r') reset()
}))
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => keys[e.sourceEvent.key] = false))

let light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene)
light.intensity = .5

let wall = MeshBuilder.CreateBox('wall', {
  width: 5,
  height: 6,
  depth: 1
})
wall.position.set(1,3,-3)


const arenaSize = 50
let grassMaterial = new StandardMaterial('grassMaterial', scene)
let grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene)
grassMaterial.ambientTexture = grassTexture
let ground = MeshBuilder.CreateGround('ground', {
  height: arenaSize,
  width: arenaSize
}, scene)
ground.material = grassMaterial

const characterSize = 2
const characterSpeed = .2
const characterRotationSpeed = Math.PI / 100
let character = MeshBuilder.CreateBox('character', {
  size: characterSize,
}, scene)
character.position.y = characterSize/2
character.rotationQuaternion = new Quaternion()
let move = new Vector3()


let camera = new FollowCamera('camera', new Vector3(0,0,0), scene, character)
camera.attachControl(document.body)

reset()

engine.runRenderLoop(() => {
  // const deltaTime = scene.getEngine().getDeltaTime()/1000
  moveCharacter()
  scene.render()
})

function moveCharacter() {
  let moved = false
  if (keys['w']) {
    move.z = -characterSpeed
    moved = true
  }
  if (keys['s']) {
    move.z = characterSpeed
    moved = true
  }
  if (keys['d']) {
    character.rotationQuaternion.multiplyInPlace(Quaternion.RotationAxis(new Vector3(0,1,0), characterRotationSpeed))
  }
  if (keys['a']) {
    character.rotationQuaternion.multiplyInPlace(Quaternion.RotationAxis(new Vector3(0,1,0), -characterRotationSpeed))
  }
  if (moved) {
    let mat = new Matrix()
    character.rotationQuaternion.toRotationMatrix(mat)
    character.position.addInPlace(Vector3.TransformCoordinates(move, mat))
  }
}

function reset() {
  clearStatus()
}

function clearStatus() {
  msg.style.display = 'none'
}