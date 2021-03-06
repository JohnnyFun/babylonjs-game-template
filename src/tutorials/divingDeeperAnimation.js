// https://doc.babylonjs.com/divingDeeper/animation

import { Animation, ArcRotateCamera, HemisphericLight, Mesh, MeshBuilder, Scene, Vector3 } from '@babylonjs/core'

let scene

export default async function create(engine, canvas) {
  scene = new Scene(engine)
  scene.beginAnimation
  const camera = new ArcRotateCamera('camera', 7.331, 1.039, 29, new Vector3(), scene)
  camera.attachControl(canvas, true)
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  // simpleAnimation()
  // pausingAndResuming()
  // relativeAnimation()
  movieClip() // as opposed to game clip--animation controlling the camera _and_ stuff in the scene. game clip is independent of camera
  return scene
}

function movieClip() {
  
}

function relativeAnimation() {
  // tell how to do an animation. subsequent cycles are additive. e.g. show how to move to the left, now the box knows how to move the the left infinitely
  const box = MeshBuilder.CreateBox('box', {}, scene)
  const frameRate = 10
  const xSlideRelative = new Animation('xSlideRelative', 'position.x', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_RELATIVE)
  xSlideRelative.setKeys([
    {frame: 0, value: 1},
    {frame:frameRate, value: 2}
  ])
  box.animations.push(xSlideRelative)
  scene.beginAnimation(box, 0, getLastFrame(xSlideRelative), true)
}

function pausingAndResuming() {
  const spoke = MeshBuilder.CreateCylinder('spoke', {height:10, diameter:2}, scene)
  const frameRate = 10
  const rotate = new Animation('rotate', 'rotation.z', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)
  rotate.setKeys([
    {frame:0, value: 0},
    {frame:frameRate, value: Math.PI*2}
  ])
  spoke.animations.push(rotate)

  let on = false
  let rotateAnimation = null
  window.addEventListener('click', e => {
    if (!on)
      if (rotateAnimation)
        rotateAnimation.restart() // doesn't reset position--carrys on where it left off
      else
        rotateAnimation = scene.beginAnimation(spoke, 0, getLastFrame(rotate), true)
    else rotateAnimation.pause()
    on = !on
  })
}

function simpleAnimation() {
  const box = MeshBuilder.CreateBox('box', {}, scene)
  const xSlide = makeSimpleSlideAnimation()
  box.animations.push(xSlide)
  scene.beginAnimation(box, 0, getLastFrame(xSlide), true)
}

function makeSimpleSlideAnimation() {
  const frameRate = 10 // 1 sec of time equals this number of frames--so if you want an animation to take 500ms, divide by two for "frame" in keys
  const xSlide = new Animation('xSlide', 'position.x', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)
  xSlide.setKeys([
    { frame: 0, value: 2 },
    { frame: frameRate, value: -2 },
    { frame: frameRate * 2, value: 2 },
  ])
  return xSlide
}

function getLastFrame(animation) {
  return animation._keys[animation._keys.length - 1].frame
}