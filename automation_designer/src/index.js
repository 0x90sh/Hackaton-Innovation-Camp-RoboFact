import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let camera, scene, renderer, controls, transformControls;
let plane, raycaster, pointer;
let isShiftDown = false, isCtrlDown = false, isAltDown = false;
let objects = [], walls = [];
let selectedObject = null;

const models = {};
let currentModelKey = 'arm';

const loadingScreen = document.getElementById('loading-screen');
const loadingMessage = document.getElementById('loading-message');
let roomWidth = 1000, roomDepth = 1000, roomHeight = 200;
let widthSlider = document.getElementById('roomWidth');
let depthSlider = document.getElementById('roomDepth');
let heightSlider = document.getElementById('roomHeight');
let widthValue = document.getElementById('widthValue');
let depthValue = document.getElementById('depthValue');
let heightValue = document.getElementById('heightValue');

const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = function () {
    console.log("All assets loaded!");
    fadeOutLoadingScreen();
    onAssetsLoaded();
};

init();
loadModels(); // Lädt alle Modelle

function init() {
    // Kamera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(700, 900, 1000);
    camera.lookAt(0, 0, 0);

    // Szene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // GridHelper (optional)
    const gridHelper = new THREE.GridHelper(2000, 40);
    scene.add(gridHelper);

    // Raycaster und Pointer
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Texturen laden
    const textureLoader = new THREE.TextureLoader();

    // Himmelskugel (SkyDome)
    const skyTexture = textureLoader.load('/sky_texture.jpg');
    const skyGeometry = new THREE.SphereGeometry(2000, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        map: skyTexture, 
        side: THREE.BackSide  // Textur von innen sichtbar
    });
    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyDome);

    // Boden mit wiederholbarer Textur
    const floorTexture = textureLoader.load('/floor-texture.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
    const floorGeometry = new THREE.PlaneGeometry(4000, 4000);
    floorGeometry.rotateX(-Math.PI / 2);
    plane = new THREE.Mesh(floorGeometry, floorMaterial);
    plane.receiveShadow = true;
    scene.add(plane);
    objects.push(plane);

    // Beleuchtung
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(300, 1000, 500);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 5000;
    dirLight.shadow.camera.left = -2000;
    dirLight.shadow.camera.right = 2000;
    dirLight.shadow.camera.top = 2000;
    dirLight.shadow.camera.bottom = -2000;
    scene.add(dirLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    // Eventlistener für Raumanpassung
    widthSlider.addEventListener("input", updateRoom);
    depthSlider.addEventListener("input", updateRoom);
    heightSlider.addEventListener("input", updateRoom);

    document.getElementById('exportButton').addEventListener('click', exportSceneToClipboard);
    document.getElementById('importButton').addEventListener('click', importSceneFromClipboard);

    // Erzeuge die Wände (inkl. Texturen)
    createWalls();
}

function loadModels() {
    loadModel('arm', './arm.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('arm_kurze_schiene', './arm_kurze_schiene.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('arm_lange_schiene', './arm_lange_schiene.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('förderband', './förderband.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('förderband_hoch', './förderband_hoch.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
}

function loadModel(key, url, scale, placementOffset = new THREE.Vector3(0, 0, 0)) {
    const loader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.copy(scale);
        const boundingBox = new THREE.Box3().setFromObject(model);
        const center = boundingBox.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -boundingBox.min.y, -center.z);
        model.userData.placementOffset = placementOffset;
        models[key] = model;
        console.log(`Model "${key}" loaded successfully:`, model);
    },
    (xhr) => console.log(`Loading Model "${key}": ${Math.round(xhr.loaded / xhr.total * 100)}%`),
    (error) => console.error(`Error loading model "${key}":`, error));
}

function onAssetsLoaded() {
    console.log("All models are now ready!");
    setTimeout(() => {
        transformControls = new TransformControls(camera, renderer.domElement);
        scene.add(transformControls.getHelper());
        transformControls.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value;
        });
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onDocumentKeyDown);
        document.addEventListener('keyup', onDocumentKeyUp);
        window.addEventListener('resize', onWindowResize);

        // Dynamisch die Modelle im Select-Element aktualisieren
        updateModelSelect();
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            currentModelKey = e.target.value;
        });

        animate();
    }, 200);
}

function updateModelSelect() {
    const select = document.getElementById('modelSelect');
    select.innerHTML = ""; // Alte Optionen entfernen
    Object.keys(models).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.text = key.replace(/_/g, " ");
        select.appendChild(option);
    });
    select.value = currentModelKey;
}

function createWalls() {
    // Entferne alte Wände
    walls.forEach(w => scene.remove(w));
    walls = [];

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('/wall-texture.jpg');
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(roomWidth / 200, roomHeight / 200);

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        side: THREE.BackSide
    });

    const halfW = roomWidth / 2;
    const halfD = roomDepth / 2;

    // Hintere Wand
    let wallGeometry1 = new THREE.BoxGeometry(roomWidth, roomHeight, 10);
    let wall1 = new THREE.Mesh(wallGeometry1, wallMaterial);
    wall1.position.set(0, roomHeight / 2, halfD);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    scene.add(wall1);
    walls.push(wall1);

    // Vordere Wand
    let wallGeometry2 = new THREE.BoxGeometry(roomWidth, roomHeight, 10);
    let wall2 = new THREE.Mesh(wallGeometry2, wallMaterial);
    wall2.position.set(0, roomHeight / 2, -halfD);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    scene.add(wall2);
    walls.push(wall2);

    // Rechte Seite
    let wallGeometry3 = new THREE.BoxGeometry(10, roomHeight, roomDepth);
    let wall3 = new THREE.Mesh(wallGeometry3, wallMaterial);
    wall3.position.set(halfW, roomHeight / 2, 0);
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    scene.add(wall3);
    walls.push(wall3);

    // Linke Seite
    let wallGeometry4 = new THREE.BoxGeometry(10, roomHeight, roomDepth);
    let wall4 = new THREE.Mesh(wallGeometry4, wallMaterial);
    wall4.position.set(-halfW, roomHeight / 2, 0);
    wall4.castShadow = true;
    wall4.receiveShadow = true;
    scene.add(wall4);
    walls.push(wall4);

    render();
}

function onPointerDown(event) {
    if (event.target.closest('#uiPanel')) return;
    event.preventDefault();
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, true);
    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        while (clickedObject.parent && clickedObject.parent !== scene) {
            clickedObject = clickedObject.parent;
        }
        if (isShiftDown) {
            if (clickedObject === plane || walls.includes(clickedObject)) {
                console.warn("Cannot delete the floor or walls.");
                return;
            }
            scene.remove(clickedObject);
            objects = objects.filter(obj => obj !== clickedObject);
            deselectObject();
            render();
        } else if (isCtrlDown) {
            if (currentModelKey && models[currentModelKey]) {
                const objectToPlace = models[currentModelKey].clone();
                objectToPlace.position.copy(intersects[0].point).add(intersects[0].face.normal);
                objectToPlace.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
                if (objectToPlace.userData.placementOffset) {
                    objectToPlace.position.add(objectToPlace.userData.placementOffset);
                }
                objectToPlace.userData.modelKey = currentModelKey;
                objectToPlace.castShadow = true;
                objectToPlace.receiveShadow = true;
                scene.add(objectToPlace);
                objects.push(objectToPlace);
                render();
            } else {
                console.warn("No model selected for placement.");
            }
        } else if (isAltDown) {
            if (!walls.includes(clickedObject) && clickedObject !== plane) {
                selectObject(clickedObject);
            } else {
                deselectObject();
            }
        } else {
            return;
        }
    } else {
        deselectObject();
    }
}
function exportSceneToClipboard() {
    // Alle platzierten Modelle (mit modelKey) exportieren
    const modelsArray = objects.filter(obj => obj.userData && obj.userData.modelKey).map(obj => {
        return {
            modelKey: obj.userData.modelKey,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale:    { x: obj.scale.x,    y: obj.scale.y,    z: obj.scale.z }
        };
    });

    // Exportobjekt mit Raumdaten und Modellen
    const exportData = {
        room: {
            width: roomWidth,
            depth: roomDepth,
            height: roomHeight
        },
        models: modelsArray
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    navigator.clipboard.writeText(jsonStr).then(() => {
        console.log("Scene (inkl. Raumdaten) exported to clipboard.");
    }).catch(err => {
        console.error("Fehler beim Kopieren in die Zwischenablage:", err);
        alert("Fehler beim Exportieren!");
    });
}


function importSceneFromClipboard() {
    navigator.clipboard.readText().then(text => {
        let importData;
        try {
            importData = JSON.parse(text);
        } catch (e) {
            alert("Zwischenablage enthält kein gültiges JSON!");
            return;
        }

        let modelsData = [];

        // Prüfe, ob es sich um ein Objekt mit room- und models-Properties handelt
        if (typeof importData === "object" && !Array.isArray(importData)) {
            if (importData.room && typeof importData.room === "object") {
                // Raumdaten übernehmen und UI aktualisieren
                if (typeof importData.room.width === "number" &&
                    typeof importData.room.depth === "number" &&
                    typeof importData.room.height === "number") {
                    roomWidth = importData.room.width;
                    roomDepth = importData.room.depth;
                    roomHeight = importData.room.height;
                    // Optional: Slider und Textanzeigen aktualisieren
                    widthSlider.value = roomWidth;
                    depthSlider.value = roomDepth;
                    heightSlider.value = roomHeight;
                    widthValue.textContent = roomWidth;
                    depthValue.textContent = roomDepth;
                    heightValue.textContent = roomHeight;
                    createWalls();
                } else {
                    alert("Ungültige Raumdaten!");
                    return;
                }
            }
            if (importData.models && Array.isArray(importData.models)) {
                modelsData = importData.models;
            } else {
                alert("Es fehlt der 'models'-Array im Import!");
                return;
            }
        } else if (Array.isArray(importData)) {
            // Falls direkt ein Array vorliegt (Legacy-Fall)
            modelsData = importData;
        } else {
            alert("Ungültiges Importformat!");
            return;
        }

        // Entferne alle existierenden platzierten Modelle (mit modelKey)
        objects.filter(obj => obj.userData && obj.userData.modelKey).forEach(obj => {
            scene.remove(obj);
        });
        objects = objects.filter(obj => !(obj.userData && obj.userData.modelKey));

        // Importiere die Modelle
        modelsData.forEach(item => {
            if (typeof item.modelKey !== "string" ||
                typeof item.position !== "object" ||
                typeof item.rotation !== "object" ||
                typeof item.scale !== "object" ||
                typeof item.position.x !== "number" ||
                typeof item.position.y !== "number" ||
                typeof item.position.z !== "number" ||
                typeof item.rotation.x !== "number" ||
                typeof item.rotation.y !== "number" ||
                typeof item.rotation.z !== "number" ||
                typeof item.scale.x !== "number" ||
                typeof item.scale.y !== "number" ||
                typeof item.scale.z !== "number") {
                console.warn("Überspringe ungültiges Element:", item);
                return;
            }
            if (!models[item.modelKey]) {
                console.warn(`Modell "${item.modelKey}" nicht gefunden. Überspringe Element.`);
                return;
            }
            const objectToPlace = models[item.modelKey].clone();
            objectToPlace.position.set(item.position.x, item.position.y, item.position.z);
            objectToPlace.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
            objectToPlace.scale.set(item.scale.x, item.scale.y, item.scale.z);
            objectToPlace.userData.modelKey = item.modelKey; // Wiederherstellung des Modellschlüssels
            objectToPlace.castShadow = true;
            objectToPlace.receiveShadow = true;
            scene.add(objectToPlace);
            objects.push(objectToPlace);
        });
        render();
    }).catch(err => {
        console.error("Fehler beim Auslesen der Zwischenablage:", err);
        alert("Fehler beim Importieren!");
    });
}


function selectObject(object) {
    deselectObject();
    selectedObject = object;
    transformControls.attach(object);
    render();
}

function deselectObject() {
    if (selectedObject) {
        transformControls.detach();
        selectedObject = null;
    }
    render();
}

function fadeOutLoadingScreen() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 1000);
}

function onDocumentKeyDown(event) {
    if (event.key === 'Shift') isShiftDown = true;
    if (event.key === 'Control') isCtrlDown = true;
    if (event.key === 'Alt') isAltDown = true;
    switch (event.key) {
        case 'g':
            transformControls.setMode('translate');
            break;
        case 'r':
            transformControls.setMode('rotate');
            break;
        case 's':
            transformControls.setMode('scale');
            break;
    }
}

function onDocumentKeyUp(event) {
    if (event.key === 'Shift') isShiftDown = false;
    if (event.key === 'Control') isCtrlDown = false;
    if (event.key === 'Alt') isAltDown = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
}

function updateRoom() {
    roomWidth = parseInt(widthSlider.value);
    roomDepth = parseInt(depthSlider.value);
    roomHeight = parseInt(heightSlider.value);
    widthValue.textContent = roomWidth;
    depthValue.textContent = roomDepth;
    heightValue.textContent = roomHeight;
    createWalls();
}
