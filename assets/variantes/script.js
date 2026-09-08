(function() {
    // ============ DATOS DINÁMICOS ============
    let attributeOptions = [];
    let effectOptions = [];
    let entityTypes = [];
    let itemOptions = [];
    let blockOptions = [];
    let enchantOptions = [];
    let abbreviationMap = {};

    const pageState = {};

    function getPage(key) { return pageState[key] || 0; }

    function setPage(key, page) { pageState[key] = page; }

    function stripMinecraft(str) { return str.replace(/^minecraft:/, ''); }

    async function loadJSON(path) {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`No se pudo cargar ${path}`);
        return await resp.json();
    }

    async function loadAllData() {
        try {
            const [attr, eff, ent, it, blk, ench, abbrData] = await Promise.all([
                loadJSON('../assets/variantes/id/attribute/minecraft.json'),
                loadJSON('../assets/variantes/id/mob_effect/minecraft.json'),
                loadJSON('../assets/variantes/id/entity_type/minecraft.json'),
                loadJSON('../assets/variantes/id/item/minecraft.json'),
                loadJSON('../assets/variantes/id/block/minecraft.json'),
                loadJSON('../assets/variantes/id/enchantment/minecraft.json'),
                loadJSON('../assets/variantes/id/entity_abbreviations/minecraft.json')
            ]);
            attributeOptions = attr.map(stripMinecraft);
            effectOptions = eff.map(stripMinecraft);
            entityTypes = ent.map(stripMinecraft);
            itemOptions = it.map(stripMinecraft);
            blockOptions = blk.map(stripMinecraft);
            enchantOptions = ench.map(stripMinecraft);
            abbreviationMap = abbrData;
            fillDatalist('itemsList', [...new Set([...itemOptions, ...blockOptions])].sort());
            fillDatalist('enchantsList', enchantOptions);
            fillDatalist('effectsList', effectOptions);
            fillDatalist('attributesList', attributeOptions);
            fillDatalist('mobsList', entityTypes);
        } catch (e) {
            console.error(e);
            alert('Error al cargar los archivos de datos. Verifica las carpetas /id/...');
        }
        fullRender();
    }

    function fillDatalist(id, options) {
        const dl = document.getElementById(id);
        dl.innerHTML = options.map(opt => `<option value="${opt}">`).join('');
    }

    // ============ SISTEMA DE ARCHIVOS ============
    let fileSystem = { folders: {}, files: {} };
    let currentFileId = 'main';
    let selectedItems = new Set();
    let clipboardItems = { files: new Set(), folders: new Set(), action: null };
    let contextTarget = null;
    const ITEMS_PER_PAGE = 5;

    function generateId() { return 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }

    function sanitizeName(name) {
        let s = name.toLowerCase()
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        if (!s) s = 'sin_nombre';
        return s;
    }

    function initFileSystem() {
        fileSystem = { folders: { root: { name: 'root', parent: null, children: [] } }, files: {} };
        const id = generateId();
        fileSystem.files[id] = { name: 'proyecto_principal', parent: 'root', data: null };
        currentFileId = id;
        setCurrentFileData({
            mobSelections: {},
            numVariants: 1,
            variants: createDefaultVariants(),
            cleanItems: true,
            activeVariantTab: 0
        });
        if (fileSystem.folders['root']) {
            fileSystem.folders['root'].children = [id];
        }
    }

    function createDefaultVariants() {
        const defaultType = entityTypes[0] || 'zombie';
        return [{
            min: 1,
            max: 1,
            replace: false,
            replaceConfig: { mode: 'single', mobs: [{ type: defaultType, option: 'universal', custom: createEmptyCustom() }] },
            equipment: createEmptyEquipment(),
            effects: [],
            attributes: [],
            nameConfig: createEmptyNameConfig(),
            creeperConfig: null,
            sizeConfig: null,
            areaEffects: [],
            arrowKillEffects: []
        }];
    }

    function getCurrentFileData() {
        const file = fileSystem.files[currentFileId];
        return file && file.data ? file.data : null;
    }

    function setCurrentFileData(data) {
        if (!fileSystem.files[currentFileId]) fileSystem.files[currentFileId] = { name: 'proyecto_principal', parent: 'root', data: null };
        fileSystem.files[currentFileId].data = data;
    }

    function syncUIFromState() {
        numVariantsInput.value = state.numVariants;
        cleanItemsCheck.checked = state.cleanItems;
    }

    function loadFileState(fileId) {
        if (fileId === currentFileId) return;
        saveCurrentState();
        currentFileId = fileId;
        const data = getCurrentFileData();
        if (data) {
            state.mobSelections = data.mobSelections || {};
            state.numVariants = data.numVariants || 1;
            state.variants = data.variants || [];
            state.cleanItems = data.cleanItems !== undefined ? data.cleanItems : true;
            state.activeVariantTab = Math.min(data.activeVariantTab || 0, state.variants.length - 1);
            state.variants.forEach(v => {
                if (v.nameConfig && v.nameConfig.advancedMode === undefined) {
                    v.nameConfig.advancedMode = false;
                    v.nameConfig.advancedColors = ['#00ccff', '#ffee00'];
                    v.nameConfig.advancedStyle = 'gradient';
                }
            });
        } else {
            resetState();
        }
        syncUIFromState();
        fullRender();
        renderFileTree();
    }

    function saveCurrentState() {
        const data = {
            mobSelections: state.mobSelections,
            numVariants: state.numVariants,
            variants: state.variants,
            cleanItems: state.cleanItems,
            activeVariantTab: state.activeVariantTab
        };
        setCurrentFileData(data);
    }

    let saveTimeout = null;
    function autoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentState();
            saveTimeout = null;
        }, 300);
    }

    window.addEventListener('beforeunload', function() {
        saveCurrentState();
    });

    window.createFile = function(parentId = null) {
        saveCurrentState();
        let name = prompt('Nombre del archivo (solo minúsculas, números y guión bajo):', 'nuevo_proyecto');
        if (!name) return;
        name = sanitizeName(name);
        let finalName = name;
        let counter = 1;
        while (Object.values(fileSystem.files).some(f => f.name === finalName && f.parent === (parentId || 'root'))) {
            finalName = name + '_(' + (++counter) + ')';
        }
        const id = generateId();
        fileSystem.files[id] = { name: finalName, parent: parentId || 'root', data: null };
        const parentFolder = fileSystem.folders[parentId || 'root'];
        if (parentFolder) {
            if (!parentFolder.children) parentFolder.children = [];
            parentFolder.children.push(id);
        }
        currentFileId = id;
        resetState();
        setCurrentFileData({
            mobSelections: {},
            numVariants: 1,
            variants: createDefaultVariants(),
            cleanItems: true,
            activeVariantTab: 0
        });
        syncUIFromState();
        fullRender();
        renderFileTree();
    };

    function resetState() {
        state.mobSelections = {};
        state.numVariants = 1;
        state.variants = createDefaultVariants();
        state.cleanItems = true;
        state.activeVariantTab = 0;
        state.variants.forEach(v => {
            if (v.nameConfig && v.nameConfig.advancedMode === undefined) {
                v.nameConfig.advancedMode = false;
                v.nameConfig.advancedColors = ['#00ccff', '#ffee00'];
                v.nameConfig.advancedStyle = 'gradient';
            }
        });
    }

    // ============ IMPORTACIÓN DE CARPETAS Y ZIP ============
    function createPath(folderPath, rootId = 'root') {
        const parts = folderPath.split('/').filter(p => p && p !== '.');
        let currentParent = rootId;
        for (const part of parts) {
            let found = null;
            for (const [fid, folder] of Object.entries(fileSystem.folders)) {
                if (folder.name === part && folder.parent === currentParent) {
                    found = fid;
                    break;
                }
            }
            if (found) {
                currentParent = found;
            } else {
                const newId = generateId();
                fileSystem.folders[newId] = { name: part, parent: currentParent, children: [] };
                if (!fileSystem.folders[currentParent].children) fileSystem.folders[currentParent].children = [];
                fileSystem.folders[currentParent].children.push(newId);
                currentParent = newId;
            }
        }
        return currentParent;
    }

    window.importZip = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const zip = await JSZip.loadAsync(file);
            const entries = Object.keys(zip.files);
            let imported = 0;
            for (const entryName of entries) {
                const entry = zip.files[entryName];
                if (entry.dir) continue;
                if (!entryName.endsWith('.json')) continue;
                const content = await entry.async('string');
                let data;
                try { data = JSON.parse(content); } catch (e) { continue; }
                const pathParts = entryName.split('/');
                const fileName = pathParts.pop();
                const folderPath = pathParts.join('/');
                const parentFolderId = createPath(folderPath);
                const baseName = sanitizeName(fileName.replace('.json', ''));
                let finalName = baseName;
                let counter = 1;
                while (Object.values(fileSystem.files).some(f => f.name === finalName && f.parent === parentFolderId)) {
                    finalName = baseName + '_(' + (++counter) + ')';
                }
                const newId = generateId();
                const clonedData = JSON.parse(JSON.stringify(data));
                fileSystem.files[newId] = { name: finalName, parent: parentFolderId, data: clonedData };
                if (!fileSystem.folders[parentFolderId].children) fileSystem.folders[parentFolderId].children = [];
                fileSystem.folders[parentFolderId].children.push(newId);
                imported++;
            }
            renderFileTree();
            alert(`Importados ${imported} archivos desde ZIP.`);
        } catch (e) {
            alert('Error al leer el ZIP: ' + e.message);
        }
        event.target.value = '';
    };

    window.importFolder = function(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        let imported = 0;
        for (const file of files) {
            if (!file.name.endsWith('.json')) continue;
            const relPath = file.webkitRelativePath;
            const pathParts = relPath.split('/');
            const fileName = pathParts.pop();
            const folderPath = pathParts.join('/');
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    const parentFolderId = createPath(folderPath);
                    const baseName = sanitizeName(fileName.replace('.json', ''));
                    let finalName = baseName;
                    let counter = 1;
                    while (Object.values(fileSystem.files).some(f => f.name === finalName && f.parent === parentFolderId)) {
                        finalName = baseName + '_(' + (++counter) + ')';
                    }
                    const newId = generateId();
                    const clonedData = JSON.parse(JSON.stringify(data));
                    fileSystem.files[newId] = { name: finalName, parent: parentFolderId, data: clonedData };
                    if (!fileSystem.folders[parentFolderId].children) fileSystem.folders[parentFolderId].children = [];
                    fileSystem.folders[parentFolderId].children.push(newId);
                    imported++;
                    if (imported === files.length) {
                        renderFileTree();
                        alert(`Importados ${imported} archivos desde carpeta.`);
                    }
                } catch (e) {
                    console.warn('Error al leer archivo:', file.name, e);
                }
            };
            reader.readAsText(file);
        }
        if (files.length === 0) {
            alert('No se encontraron archivos .json en la carpeta seleccionada.');
        }
        event.target.value = '';
    };

    function toggleFolder(folderId) {
        const ul = document.getElementById('folderChildren_' + folderId);
        if (ul) {
            const isHidden = ul.style.display === 'none';
            ul.style.display = isHidden ? '' : 'none';
            const icon = document.querySelector(`[data-folder-toggle="${folderId}"]`);
            if (icon) icon.textContent = isHidden ? '📂' : '📁';
        }
    }

    function renderFileTree() {
        const tree = document.getElementById('fileTree');
        let html = '<ul>';

        function renderFolder(folderId, depth) {
            const folder = fileSystem.folders[folderId];
            if (!folder || folderId === 'root') {
                if (folderId === 'root') {
                    const children = folder ? folder.children || [] : [];
                    children.forEach(childId => {
                        if (fileSystem.folders[childId]) renderFolder(childId, depth);
                        else if (fileSystem.files[childId]) renderFile(childId, depth);
                    });
                }
                return;
            }
            const isSel = selectedItems.has(folderId);
            const childUlId = 'folderChildren_' + folderId;
            html += `<li class="folder" data-id="${folderId}" data-type="folder" draggable="true" ondragstart="dragStart(event, 'folder', '${folderId}')" ondragover="dragOver(event)" ondrop="drop(event, 'folder', '${folderId}')" oncontextmenu="showContextMenu(event, 'folder', '${folderId}')">
                        <input type="checkbox" data-id="${folderId}" data-type="folder" onchange="toggleSelectItem(event, '${folderId}', 'folder')" ${isSel ? 'checked' : ''}>
                        <span onclick="toggleFolder('${folderId}')" style="cursor:pointer;">
                            <span data-folder-toggle="${folderId}">📂</span> ${folder.name}
                        </span>
                    </li>`;
            html += `<ul id="${childUlId}" style="display:block;padding-left:20px;">`;
            (folder.children || []).forEach(childId => {
                if (fileSystem.folders[childId]) renderFolder(childId, depth + 1);
                else if (fileSystem.files[childId]) renderFile(childId, depth + 1);
            });
            html += `</ul>`;
        }

        function renderFile(fileId, depth) {
            const file = fileSystem.files[fileId];
            if (!file) return;
            const isActive = fileId === currentFileId;
            const isSel = selectedItems.has(fileId);
            html += `<li data-id="${fileId}" data-type="file" draggable="true" ondragstart="dragStart(event, 'file', '${fileId}')" style="${isActive ? 'background:#ddeeff;' : ''}${isSel ? 'background:#ffffaa;' : ''}" oncontextmenu="showContextMenu(event, 'file', '${fileId}')" onclick="selectFileItem(event, '${fileId}')">
                        <input type="checkbox" data-id="${fileId}" data-type="file" onchange="toggleSelectItem(event, '${fileId}', 'file')" ${isSel ? 'checked' : ''}>
                        📄 ${file.name}${isActive ? ' (activo)' : ''}
                    </li>`;
        }
        if (fileSystem.folders['root']) renderFolder('root', 0);
        html += '</ul>';
        tree.innerHTML = html;
        updatePasteButton();
    }

    window.showContextMenu = function(event, type, id) {
        event.preventDefault();
        event.stopPropagation();
        const menu = document.getElementById('contextMenu');
        contextTarget = { type, id };
        let html = '';
        if (type === 'file') {
            html += `<div onclick="setAsMain('${id}')">📂 Colocar como principal</div>`;
        }
        html += `<div onclick="createFileInContext()">📄 Crear archivo</div>`;
        html += `<div onclick="createFolderInContext()">📁 Crear carpeta</div>`;
        html += `<div onclick="copyContext()">📋 Copiar</div>`;
        html += `<div onclick="renameContext()">✏️ Renombrar</div>`;
        html += `<div onclick="pasteContext()">📌 Pegar</div>`;
        html += `<hr>`;
        if (type === 'file') {
            html += `<div onclick="exportContextFile()">📤 Exportar configuración actual (JSON)</div>`;
        }
        html += `<div onclick="exportAllFilesZip()">📤 Exportar todos en ZIP (archivos separados)</div>`;
        html += `<div onclick="downloadDatapack('all')">📦 Descargar datapack (todo junto)</div>`;
        html += `<hr>`;
        html += `<div onclick="document.getElementById('importFileAsNew').click()">📥 Importar JSON</div>`;
        html += `<div onclick="document.getElementById('importZipInput').click()">📦 Importar ZIP</div>`;
        html += `<div onclick="document.getElementById('importFolderInput').click()">📂 Importar carpeta</div>`;
        html += `<div onclick="deleteContext()">🗑️ Eliminar</div>`;
        menu.innerHTML = html;
        menu.style.display = 'block';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
    };

    window.hideContextMenu = function() {
        document.getElementById('contextMenu').style.display = 'none';
        contextTarget = null;
    };

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) hideContextMenu();
    });

    window.setAsMain = function(fileId) {
        loadFileState(fileId);
        hideContextMenu();
    };

    window.createFileInContext = function() {
        const targetFolder = contextTarget && contextTarget.type === 'folder' ? contextTarget.id : 'root';
        createFile(targetFolder);
        hideContextMenu();
    };

    window.createFolderInContext = function() {
        const targetFolder = contextTarget && contextTarget.type === 'folder' ? contextTarget.id : 'root';
        createFolder(targetFolder);
        hideContextMenu();
    };

    window.copyContext = function() {
        if (!contextTarget) return;
        if (contextTarget.type === 'file') clipboardItems.files.add(contextTarget.id);
        else if (contextTarget.type === 'folder') clipboardItems.folders.add(contextTarget.id);
        clipboardItems.action = 'copy';
        updatePasteButton();
        hideContextMenu();
    };

    window.renameContext = function() {
        if (!contextTarget) return;
        selectedItems = new Set([contextTarget.id]);
        renameSelected();
        hideContextMenu();
    };

    window.pasteContext = function() {
        const targetFolder = contextTarget && contextTarget.type === 'folder' ? contextTarget.id : 'root';
        pasteFilesTo(targetFolder);
        hideContextMenu();
    };

    window.exportContextFile = function() {
        if (!contextTarget || contextTarget.type !== 'file') return;
        const file = fileSystem.files[contextTarget.id];
        if (file && file.data) {
            downloadJSON(file.data, file.name + '.json');
        }
        hideContextMenu();
    };

    window.exportAllFilesZip = async function() {
        saveCurrentState();
        const zip = new JSZip();
        const allFileIds = Object.keys(fileSystem.files);
        for (const fid of allFileIds) {
            const file = fileSystem.files[fid];
            if (!file || !file.data) continue;
            const path = buildFunctionPath(file.name, file.parent);
            zip.file(path + '.json', JSON.stringify(file.data, null, 2));
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'configs.zip');
        hideContextMenu();
    };

    window.deleteContext = function() {
        if (!contextTarget) return;
        selectedItems = new Set([contextTarget.id]);
        deleteSelected();
        hideContextMenu();
    };

    window.toggleSelectItem = function(event, id, type) {
        event.stopPropagation();
        if (event.target.checked) {
            selectedItems.add(id);
        } else {
            selectedItems.delete(id);
        }
        renderFileTree();
    };

    window.selectFileItem = function(event, fileId) {
        if (event.target.type === 'checkbox') return;
        if (event.ctrlKey || event.metaKey) {
            if (selectedItems.has(fileId)) selectedItems.delete(fileId);
            else selectedItems.add(fileId);
        } else {
            selectedItems.clear();
            selectedItems.add(fileId);
        }
        if (!event.ctrlKey && !event.metaKey && selectedItems.size === 1) {
            loadFileState(fileId);
        }
        renderFileTree();
    };

    window.dragStart = function(event, type, id) {
        event.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    };

    window.dragOver = function(event) {
        event.preventDefault();
        event.target.classList.add('drag-over');
    };

    window.drop = function(event, targetType, targetId) {
        event.preventDefault();
        event.target.classList.remove('drag-over');
        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        if (data.type === 'file') moveFileTo(data.id, targetType === 'folder' ? targetId : 'root');
        else if (data.type === 'folder') moveFolderTo(data.id, targetType === 'folder' ? targetId : 'root');
        renderFileTree();
    };

    function moveFileTo(fileId, targetFolderId) {
        if (!fileSystem.files[fileId]) return;
        if (targetFolderId !== 'root' && !fileSystem.folders[targetFolderId]) return;
        const oldParent = fileSystem.files[fileId].parent;
        if (oldParent && fileSystem.folders[oldParent]) {
            fileSystem.folders[oldParent].children = (fileSystem.folders[oldParent].children || []).filter(id => id !== fileId);
        }
        fileSystem.files[fileId].parent = targetFolderId;
        if (targetFolderId !== 'root') {
            if (!fileSystem.folders[targetFolderId].children) fileSystem.folders[targetFolderId].children = [];
            if (!fileSystem.folders[targetFolderId].children.includes(fileId)) fileSystem.folders[targetFolderId].children.push(fileId);
        }
    }

    function moveFolderTo(folderId, targetFolderId) {
        if (!fileSystem.folders[folderId] || folderId === 'root') return;
        if (targetFolderId !== 'root' && !fileSystem.folders[targetFolderId]) return;
        const oldParent = fileSystem.folders[folderId].parent;
        if (oldParent && fileSystem.folders[oldParent]) {
            fileSystem.folders[oldParent].children = (fileSystem.folders[oldParent].children || []).filter(id => id !== folderId);
        }
        fileSystem.folders[folderId].parent = targetFolderId;
        if (targetFolderId !== 'root') {
            if (!fileSystem.folders[targetFolderId].children) fileSystem.folders[targetFolderId].children = [];
            if (!fileSystem.folders[targetFolderId].children.includes(folderId)) fileSystem.folders[targetFolderId].children.push(folderId);
        }
    }

    window.createFolder = function(parentId = null) {
        let name = prompt('Nombre de la carpeta (solo minúsculas, números y guión bajo):', 'nueva_carpeta');
        if (!name) return;
        name = sanitizeName(name);
        const id = generateId();
        fileSystem.folders[id] = { name: name, parent: parentId || 'root', children: [] };
        const parentFolder = fileSystem.folders[parentId || 'root'];
        if (parentFolder) {
            if (!parentFolder.children) parentFolder.children = [];
            parentFolder.children.push(id);
        }
        renderFileTree();
    };

    window.deleteSelected = function() {
        if (selectedItems.size === 0) return alert('Selecciona archivos o carpetas primero.');
        if (!confirm('¿Eliminar los elementos seleccionados?')) return;
        let anyFileDeleted = false;
        selectedItems.forEach(id => {
            if (fileSystem.files[id]) {
                anyFileDeleted = true;
                if (id === currentFileId) {
                    const others = Object.keys(fileSystem.files).filter(fid => fid !== id);
                    if (others.length > 0) {
                        loadFileState(others[0]);
                    } else {
                        createFile();
                    }
                }
                const parent = fileSystem.files[id].parent;
                if (parent && fileSystem.folders[parent]) {
                    fileSystem.folders[parent].children = (fileSystem.folders[parent].children || []).filter(cid => cid !== id);
                }
                delete fileSystem.files[id];
            } else if (fileSystem.folders[id]) {
                deleteFolderRecursive(id);
            }
        });
        selectedItems.clear();
        renderFileTree();
        fullRender();
    };

    function deleteFolderRecursive(folderId) {
        const folder = fileSystem.folders[folderId];
        if (!folder) return;
        (folder.children || []).forEach(childId => {
            if (fileSystem.folders[childId]) deleteFolderRecursive(childId);
            else if (fileSystem.files[childId]) {
                if (childId === currentFileId) {
                    const others = Object.keys(fileSystem.files).filter(fid => fid !== childId);
                    if (others.length > 0) loadFileState(others[0]);
                    else createFile();
                }
                delete fileSystem.files[childId];
            }
        });
        const parent = folder.parent;
        if (parent && fileSystem.folders[parent]) {
            fileSystem.folders[parent].children = (fileSystem.folders[parent].children || []).filter(cid => cid !== folderId);
        }
        delete fileSystem.folders[folderId];
    }

    window.renameSelected = function() {
        if (selectedItems.size !== 1) return alert('Selecciona un solo elemento para renombrar.');
        const id = [...selectedItems][0];
        const currentName = fileSystem.files[id]?.name || fileSystem.folders[id]?.name || '';
        let newName = prompt('Nuevo nombre (solo minúsculas, números y guión bajo):', currentName);
        if (!newName) return;
        newName = sanitizeName(newName);
        if (fileSystem.files[id]) fileSystem.files[id].name = newName;
        else if (fileSystem.folders[id]) fileSystem.folders[id].name = newName;
        renderFileTree();
    };

    window.copySelectedFiles = function() {
        if (selectedItems.size === 0) return alert('Selecciona elementos primero.');
        clipboardItems.files = new Set();
        clipboardItems.folders = new Set();
        selectedItems.forEach(id => {
            if (fileSystem.files[id]) clipboardItems.files.add(id);
            else if (fileSystem.folders[id]) clipboardItems.folders.add(id);
        });
        clipboardItems.action = 'copy';
        updatePasteButton();
        alert('Elementos copiados al portapapeles.');
    };

    window.pasteFiles = function() {
        pasteFilesTo('root');
    };

    function pasteFilesTo(targetId) {
        if (!clipboardItems.action) return alert('El portapapeles está vacío.');
        const targetFolder = fileSystem.folders[targetId];
        if (!targetFolder && targetId !== 'root') return alert('Carpeta destino no existe.');

        clipboardItems.files.forEach(fileId => {
            if (fileSystem.files[fileId]) {
                const sourceFile = fileSystem.files[fileId];
                if (clipboardItems.action === 'cut') {
                    moveFileTo(fileId, targetId);
                } else {
                    const clonedData = sourceFile.data ? JSON.parse(JSON.stringify(sourceFile.data)) : null;
                    let newName = sourceFile.name;
                    const exists = Object.values(fileSystem.files).some(f => f.name === newName && f.parent === targetId);
                    if (exists || sourceFile.parent === targetId) {
                        let counter = 1;
                        let base = newName;
                        while (Object.values(fileSystem.files).some(f => f.name === newName && f.parent === targetId)) {
                            newName = base + '_copia' + (counter > 1 ? '_' + counter : '');
                            counter++;
                        }
                    }
                    const newId = generateId();
                    fileSystem.files[newId] = { name: newName, parent: targetId, data: clonedData };
                    if (targetId !== 'root') {
                        if (!fileSystem.folders[targetId].children) fileSystem.folders[targetId].children = [];
                        fileSystem.folders[targetId].children.push(newId);
                    }
                }
            }
        });
        clipboardItems.folders.forEach(folderId => {
            if (fileSystem.folders[folderId]) {
                if (clipboardItems.action === 'cut') {
                    moveFolderTo(folderId, targetId);
                } else {
                    const sourceFolder = fileSystem.folders[folderId];
                    let newName = sourceFolder.name;
                    const exists = Object.values(fileSystem.folders).some(f => f.name === newName && f.parent === targetId);
                    if (exists || sourceFolder.parent === targetId) {
                        let counter = 1;
                        let base = newName;
                        while (Object.values(fileSystem.folders).some(f => f.name === newName && f.parent === targetId)) {
                            newName = base + '_copia' + (counter > 1 ? '_' + counter : '');
                            counter++;
                        }
                    }
                    const newId = generateId();
                    fileSystem.folders[newId] = { ...sourceFolder, name: newName, parent: targetId, children: [] };
                    if (targetId !== 'root') {
                        if (!fileSystem.folders[targetId].children) fileSystem.folders[targetId].children = [];
                        fileSystem.folders[targetId].children.push(newId);
                    }
                }
            }
        });
        if (clipboardItems.action === 'cut') {
            clipboardItems = { files: new Set(), folders: new Set(), action: null };
        }
        updatePasteButton();
        renderFileTree();
    }

    function updatePasteButton() {
        const btn = document.getElementById('pasteBtn');
        if (btn) btn.disabled = !clipboardItems.action;
    }

    window.exportCurrentFile = function() {
        saveCurrentState();
        const data = getCurrentFileData();
        downloadJSON(data || {}, (fileSystem.files[currentFileId]?.name || 'proyecto') + '.json');
    };

    window.exportAllSeparate = function() {
        Object.entries(fileSystem.files).forEach(([id, file]) => {
            downloadJSON(file.data || {}, file.name + '.json');
        });
    };

    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    window.importAsNewFile = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.files) {
                    Object.entries(data.files).forEach(([id, info]) => {
                        let name = sanitizeName(info.name || file.name.replace('.json', ''));
                        const newId = generateId();
                        const clonedData = info.data ? JSON.parse(JSON.stringify(info.data)) : info;
                        fileSystem.files[newId] = { name: name, parent: 'root', data: clonedData };
                        if (!fileSystem.folders['root'].children) fileSystem.folders['root'].children = [];
                        fileSystem.folders['root'].children.push(newId);
                    });
                } else {
                    let name = sanitizeName(file.name.replace('.json', ''));
                    let counter = 1;
                    while (Object.values(fileSystem.files).some(f => f.name === name)) {
                        name = sanitizeName(file.name.replace('.json', '') + '_(' + (++counter) + ')');
                    }
                    const newId = generateId();
                    const clonedData = JSON.parse(JSON.stringify(data));
                    fileSystem.files[newId] = { name: name, parent: 'root', data: clonedData };
                    if (!fileSystem.folders['root'].children) fileSystem.folders['root'].children = [];
                    fileSystem.folders['root'].children.push(newId);
                }
                renderFileTree();
                alert('Archivo importado correctamente.');
            } catch (e) { alert('Error al importar: ' + e.message); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // ============ GALERÍA ============
    let galeriaFilesCache = {};
    let galeriaPollInterval = null;
    let galeriaActiveTab = false;

    async function fetchGaleriaFileList() {
        try {
            const resp = await fetch('id/galeria/');
            if (!resp.ok) return null;
            const html = await resp.text();
            const files = [];
            const regex = /href="([^"]+\.json)"/gi;
            let match;
            while ((match = regex.exec(html)) !== null) {
                let fname = match[1];
                if (fname.startsWith('/')) fname = fname.substring(1);
                if (fname.includes('id/galeria/')) fname = fname.split('id/galeria/').pop();
                if (fname && fname.endsWith('.json') && !fname.includes('/')) {
                    files.push(fname);
                }
            }
            return [...new Set(files)];
        } catch (e) {
            console.log('Error al listar galería:', e.message);
            return null;
        }
    }

    function extractGaleriaInfo(filename, data) {
        const info = {
            filename: filename,
            displayName: filename.replace('.json', ''),
            numVariants: data.numVariants || 0,
            mobSelections: data.mobSelections || {},
            variants: data.variants || [],
            cleanItems: data.cleanItems !== undefined ? data.cleanItems : true,
            hasEquipment: false,
            hasEffects: false,
            hasAttributes: false,
            hasNameConfig: false,
            hasReplace: false,
            totalMobsSelected: 0,
            variantSummaries: []
        };
        const selMobs = Object.entries(info.mobSelections).filter(([, v]) => v.selected).map(([id]) => id);
        info.totalMobsSelected = selMobs.length;
        info.mobList = selMobs;

        info.variants.forEach((v, idx) => {
            let summary = `V${idx+1}: `;
            if (v.replace) {
                info.hasReplace = true;
                const mobs = v.replaceConfig?.mobs || [];
                summary += mobs.map(m => m.type).join('+') + ' (reemp)';
            } else {
                const eq = v.equipment || {};
                const mainItem = eq.mainhand?.item || '';
                summary += mainItem || 'sin equipo';
                if (v.nameConfig?.name) summary += ` "${v.nameConfig.name}"`;
            }
            info.variantSummaries.push(summary);

            if (v.equipment) {
                const eq = v.equipment;
                if (eq.mainhand?.item || eq.offhand?.item || eq.head?.item || eq.chest?.item || eq.legs?.item || eq.feet?.item) info.hasEquipment = true;
                for (const slot of ['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet']) {
                    if (eq[slot]?.enchants?.length > 0) info.hasEquipment = true;
                }
            }
            if (v.effects?.length) info.hasEffects = true;
            if (v.attributes?.length) info.hasAttributes = true;
            if (v.nameConfig?.name?.trim()) info.hasNameConfig = true;
            if (v.replaceConfig?.mobs) {
                v.replaceConfig.mobs.forEach(m => {
                    if (m.custom) {
                        const ceq = m.custom.equipment;
                        if (ceq) {
                            for (const slot of ['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet']) {
                                if (ceq[slot]?.item || ceq[slot]?.enchants?.length) info.hasEquipment = true;
                            }
                        }
                        if (m.custom.effects?.length) info.hasEffects = true;
                        if (m.custom.attributes?.length) info.hasAttributes = true;
                        if (m.custom.nameConfig?.name?.trim()) info.hasNameConfig = true;
                    }
                });
            }
        });
        return info;
    }

    async function scanGaleria() {
        const fileList = await fetchGaleriaFileList();
        const container = document.getElementById('galeriaContainer');
        const status = document.getElementById('galeriaStatus');
        if (fileList === null) {
            container.innerHTML = '<div><em>No se pudo acceder a la carpeta id/galeria/. Asegúrate de que exista y sea accesible.</em></div>';
            status.textContent = '❌ Error de acceso';
            return;
        }
        if (fileList.length === 0) {
            container.innerHTML = '<div><em>No se encontraron archivos .json en id/galeria/</em></div>';
            status.textContent = '📂 0 archivos';
            galeriaFilesCache = {};
            return;
        }
        const newCache = {};
        let nuevosDetectados = false;
        for (const fname of fileList) {
            if (galeriaFilesCache[fname] && galeriaFilesCache[fname].data) {
                newCache[fname] = galeriaFilesCache[fname];
            } else {
                try {
                    const resp = await fetch(`id/galeria/${fname}`);
                    if (resp.ok) {
                        const data = await resp.json();
                        const info = extractGaleriaInfo(fname, data);
                        newCache[fname] = { data, info };
                        if (!galeriaFilesCache[fname]) nuevosDetectados = true;
                    }
                } catch (e) {
                    console.log(`Error cargando ${fname}:`, e.message);
                }
            }
        }
        if (Object.keys(newCache).length !== Object.keys(galeriaFilesCache).length) nuevosDetectados = true;
        galeriaFilesCache = newCache;
        status.textContent = `📂 ${Object.keys(galeriaFilesCache).length} archivo(s)${nuevosDetectados ? ' - ✅ Actualizado' : ''}`;
        renderGaleriaCards();
    }

    function renderGaleriaCards() {
        const container = document.getElementById('galeriaContainer');
        const entries = Object.entries(galeriaFilesCache);
        if (entries.length === 0) {
            container.innerHTML = '<div><em>No se encontraron archivos .json en id/galeria/</em></div>';
            return;
        }
        let html = '<div style="display:flex;flex-wrap:wrap;gap:10px;">';
        for (const [fname, entry] of entries) {
            const info = entry.info;
            const mobTags = info.mobList.map(m => `<span class="mob-pill">${m}</span>`).join('') || '<em>Sin mobs</em>';
            const variantPreview = info.variantSummaries.slice(0, 2).join(' | ') + (info.variantSummaries.length > 2 ? ' ...' : '');
            const badges = [];
            if (info.hasEquipment) badges.push('⚔️Equip');
            if (info.hasEffects) badges.push('✨Efectos');
            if (info.hasAttributes) badges.push('📊Atrib');
            if (info.hasNameConfig) badges.push('🏷️Nombre');
            if (info.hasReplace) badges.push('🔄Reemp');
            if (info.cleanItems) badges.push('🧹Clean');
            const badgeStr = badges.join(' ');
            html += `
                    <div style="border:2px solid #888;padding:8px;width:300px;background:#fff;position:relative;" data-galeria-file="${fname}">
                        <strong style="font-size:1.1em;">📄 ${info.displayName}</strong>
                        <div style="font-size:0.85em;color:#555;">Variantes: ${info.numVariants} | Mobs: ${info.totalMobsSelected}</div>
                        <div style="margin:4px 0;">${mobTags}</div>
                        <div style="font-size:0.8em;color:#444;margin:2px 0;">${variantPreview}</div>
                        <div style="font-size:0.8em;color:#333;">${badgeStr}</div>
                        <div style="margin-top:6px;display:flex;gap:4px;">
                            <button onclick="importarDeGaleria('${fname}')" style="flex:1;">📥 Importar</button>
                            <button onclick="toggleInfoGaleria('${fname}')" style="flex:1;">ℹ️ Info</button>
                        </div>
                        <div id="galeriaInfo_${fname.replace(/[^a-zA-Z0-9]/g, '_')}" style="display:none;margin-top:6px;font-size:0.8em;max-height:300px;overflow-y:auto;border-top:1px solid #ccc;padding-top:4px;background:#fafafa;"></div>
                    </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    window.importarDeGaleria = function(fname) {
        const entry = galeriaFilesCache[fname];
        if (!entry || !entry.data) {
            alert('No se pudo cargar el archivo de la galería.');
            return;
        }
        saveCurrentState();
        const data = JSON.parse(JSON.stringify(entry.data));
        let baseName = sanitizeName(fname.replace('.json', ''));
        let counter = 1;
        while (Object.values(fileSystem.files).some(f => f.name === baseName && f.parent === 'root')) {
            baseName = sanitizeName(fname.replace('.json', '') + '_(' + (++counter) + ')');
        }
        const newId = generateId();
        fileSystem.files[newId] = { name: baseName, parent: 'root', data: data };
        if (!fileSystem.folders['root'].children) fileSystem.folders['root'].children = [];
        fileSystem.folders['root'].children.push(newId);
        renderFileTree();
        alert(`Archivo "${baseName}" importado correctamente.`);
    };

    window.toggleInfoGaleria = function(fname) {
        const divId = 'galeriaInfo_' + fname.replace(/[^a-zA-Z0-9]/g, '_');
        const div = document.getElementById(divId);
        if (!div) return;
        if (div.style.display === 'none' || div.style.display === '') {
            const entry = galeriaFilesCache[fname];
            if (!entry || !entry.data) {
                div.innerHTML = '<em>Error al cargar información.</em>';
            } else {
                const data = entry.data;
                let detalle = '<strong>Detalles completos:</strong><br>';
                detalle += `<strong>Mobs:</strong> ${entry.info.mobList.join(', ') || 'Ninguno'}<br>`;
                detalle += `<strong>Variantes:</strong> ${entry.info.numVariants}<br>`;
                detalle += `<strong>Limpiar items:</strong> ${entry.info.cleanItems ? 'Sí' : 'No'}<br><br>`;

                entry.info.variants.forEach((v, idx) => {
                    detalle += `<div style="margin:2px 0;padding:4px;background:#fff;border:1px solid #ddd;">`;
                    detalle += `<strong>Variante ${idx+1}:</strong> rango ${v.min}-${v.max}, replace=${v.replace || false}<br>`;
                    if (v.replace && v.replaceConfig) {
                        detalle += `<em>Modo:</em> ${v.replaceConfig.mode}<br>`;
                        v.replaceConfig.mobs?.forEach((m, mi) => {
                            detalle += `<div style="margin-left:10px;">Mob${mi+1}: ${m.type} (${m.option})`;
                            if (m.option === 'custom' && m.custom) {
                                detalle += '<ul>';
                                detalle += buildCustomDetailList(m.custom);
                                detalle += '</ul>';
                            }
                            detalle += '</div>';
                        });
                    } else {
                        detalle += '<ul>' + buildCustomDetailList(v) + '</ul>';
                    }
                    detalle += '</div>';
                });
                div.innerHTML = detalle;
            }
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    };

    function buildCustomDetailList(obj) {
        let html = '';
        const eq = obj.equipment || obj;
        const slots = [
            { key: 'mainhand', label: 'Mano principal' },
            { key: 'offhand', label: 'Mano secundaria' },
            { key: 'head', label: 'Cabeza' },
            { key: 'chest', label: 'Pechera' },
            { key: 'legs', label: 'Pantalones' },
            { key: 'feet', label: 'Botas' }
        ];
        slots.forEach(s => {
            const item = eq[s.key]?.item || '';
            if (item) {
                html += `<li>${s.label}: ${item} (CMD:${eq[s.key]?.cmd || 100})`;
                if (eq[s.key]?.enchants?.length) {
                    const enchs = eq[s.key].enchants.map(e => `${e.name}:${e.level}`).join(', ');
                    html += ` <small>[${enchs}]</small>`;
                }
                html += '</li>';
            }
        });
        if (obj.effects && obj.effects.length) {
            html += '<li>Efectos: ' + obj.effects.map(e => `${e.name} (dur:${e.duration}, amp:${e.amplifier})`).join(', ') + '</li>';
        }
        if (obj.attributes && obj.attributes.length) {
            html += '<li>Atributos: ' + obj.attributes.map(a => `${a.name}=${a.value}`).join(', ') + '</li>';
        }
        if (obj.nameConfig && obj.nameConfig.name?.trim()) {
            html += `<li>Nombre: "${obj.nameConfig.name}" (visible a ${obj.nameConfig.visibleDistance}m, negrita: ${obj.nameConfig.bold})`;
            if (obj.nameConfig.advancedMode) {
                html += ` [avanzado: ${obj.nameConfig.advancedStyle}]`;
            }
            html += '</li>';
        }
        if (obj.creeperConfig) {
            html += `<li>Creeper: powered=${obj.creeperConfig.powered}, fuse=${obj.creeperConfig.fuse}${obj.creeperConfig.fuseUnit}, radio=${obj.creeperConfig.explosionRadius}</li>`;
        }
        if (obj.sizeConfig && obj.sizeConfig.enabled) {
            html += `<li>Tamaño personalizado: ${obj.sizeConfig.size}</li>`;
        }
        if (obj.areaEffects && obj.areaEffects.length) {
            html += '<li>Efectos de área: ' + obj.areaEffects.map(e => `${e.effect} (dist:${e.distance}, dur:${e.duration}, amp:${e.amplifier})`).join('; ') + '</li>';
        }
        if (obj.arrowKillEffects && obj.arrowKillEffects.length) {
            html += '<li>Eliminación de flechas: ' + obj.arrowKillEffects.map(e => `${e.entityType} (dist:${e.distance})`).join('; ') + '</li>';
        }
        return html;
    }

    window.refreshGaleria = function() {
        document.getElementById('galeriaContainer').innerHTML = '<em>Escaneando galería...</em>';
        document.getElementById('galeriaStatus').textContent = '⏳ Escaneando...';
        scanGaleria();
    };

    function startGaleriaPolling() {
        if (galeriaPollInterval) return;
        galeriaPollInterval = setInterval(() => {
            if (galeriaActiveTab) {
                scanGaleria();
            }
        }, 5000);
    }

    function stopGaleriaPolling() {
        if (galeriaPollInterval) {
            clearInterval(galeriaPollInterval);
            galeriaPollInterval = null;
        }
    }

    // ============ ESTADO GLOBAL ============
    const state = {
        mobSelections: {},
        numVariants: 1,
        variants: [],
        cleanItems: true,
        activeVariantTab: 0,
    };

    let clipboardVariant = null;
    let clipboardAction = null;

    function getAutoAbbr(mobId) { return abbreviationMap[mobId] || mobId.substring(0, 2); }

    function updateAllAbbreviations() {
        const selectedIds = Object.entries(state.mobSelections).filter(([, v]) => v.selected).map(([id]) => id);
        if (selectedIds.length === 0) return;
        const firstId = selectedIds[0];
        const abbr = getAutoAbbr(firstId);
        for (const id of selectedIds) {
            if (state.mobSelections[id]) state.mobSelections[id].abbr = abbr;
        }
    }

    function createEmptyEquipment() {
        return {
            mainhand: { item: '', enchants: [], unbreakable: true, cmd: 100, color: '' },
            offhand: { item: '', enchants: [], unbreakable: true, cmd: 100, color: '' },
            head: { item: '', enchants: [], unbreakable: true, cmd: 100, color: '' },
            chest: { item: '', enchants: [], unbreakable: true, cmd: 100, color: '' },
            legs: { item: '', enchants: [], unbreakable: true, cmd: 100, color: '' },
            feet: { item: '', enchants: [], unbreakable: true, cmd: 100, color: '' },
        };
    }

    // ============ FUNCIONES DE COLOR ============
    function hexToRGB(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
    }

    function interpolateColor(hex1, hex2, factor) {
        const c1 = hexToRGB(hex1);
        const c2 = hexToRGB(hex2);
        const r = c1.r + (c2.r - c1.r) * factor;
        const g = c1.g + (c2.g - c1.g) * factor;
        const b = c1.b + (c2.b - c1.b) * factor;
        return rgbToHex(r, g, b);
    }

    function hexToHSL(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        let max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }
        return { h, s, l };
    }

    function hslToHex(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function adjustLightness(hex, amount) {
        const hsl = hexToHSL(hex);
        let newL = Math.max(0.04, Math.min(0.96, hsl.l + amount));
        return hslToHex(hsl.h, hsl.s, newL);
    }

    function generateColors(text, colors, style) {
        const chars = [...text];
        const len = chars.length;
        if (len === 0 || colors.length === 0) return [];

        const result = [];

        switch (style) {
            case 'gradient':
                for (let i = 0; i < len; i++) {
                    const factor = len > 1 ? i / (len - 1) : 0;
                    result.push(multiColorInterpolate(colors, factor));
                }
                break;

            case 'gradient-reverse':
                const revColors = [...colors].reverse();
                for (let i = 0; i < len; i++) {
                    const factor = len > 1 ? i / (len - 1) : 0;
                    result.push(multiColorInterpolate(revColors, factor));
                }
                break;

            case 'alternate-cycle':
                for (let i = 0; i < len; i++) {
                    result.push(colors[i % colors.length]);
                }
                break;

            case 'symmetric':
                const totalSegments = (colors.length - 1) * 2;
                for (let i = 0; i < len; i++) {
                    const factor = len > 1 ? i / (len - 1) : 0;
                    const pos = factor * totalSegments;
                    const idx = Math.floor(pos);
                    const frac = pos - idx;
                    let colorA, colorB;
                    if (idx < colors.length - 1) {
                        colorA = colors[idx];
                        colorB = colors[idx + 1];
                    } else {
                        const mirrorIdx = totalSegments - idx;
                        const a = Math.min(mirrorIdx, colors.length - 1);
                        const b = Math.max(mirrorIdx - 1, 0);
                        colorA = colors[a];
                        colorB = colors[b];
                    }
                    if (idx >= colors.length - 1) {
                        const mirrorIdx = totalSegments - idx;
                        const a = Math.min(mirrorIdx, colors.length - 1);
                        const b = Math.max(mirrorIdx - 1, 0);
                        result.push(interpolateColor(colors[a], colors[b], frac));
                    } else {
                        result.push(interpolateColor(colorA, colorB, frac));
                    }
                }
                break;

            case 'per-word':
                const words = splitWords(chars);
                let colorIdx = 0;
                for (const word of words) {
                    if (word === ' ') {
                        result.push(colors[0]);
                    } else {
                        const wColor = colors[colorIdx % colors.length];
                        for (let j = 0; j < word.length; j++) {
                            result.push(wColor);
                        }
                        colorIdx++;
                    }
                }
                break;

            case 'per-word-gradient':
                const words2 = splitWords(chars);
                let wIdx = 0;
                for (const word of words2) {
                    if (word === ' ') {
                        result.push(colors[0]);
                    } else {
                        const wLen = word.length;
                        const startColor = colors[wIdx % colors.length];
                        const endColor = colors[(wIdx + 1) % colors.length];
                        for (let j = 0; j < wLen; j++) {
                            const f = wLen > 1 ? j / (wLen - 1) : 0;
                            result.push(interpolateColor(startColor, endColor, f));
                        }
                        wIdx++;
                    }
                }
                break;

            case 'light-to-dark':
                const baseColor = colors[0];
                for (let i = 0; i < len; i++) {
                    const factor = len > 1 ? i / (len - 1) : 0;
                    const shift = 0.4 - factor * 0.75;
                    result.push(adjustLightness(baseColor, shift));
                }
                break;

            case 'dark-to-light':
                const baseColor2 = colors[0];
                for (let i = 0; i < len; i++) {
                    const factor = len > 1 ? i / (len - 1) : 0;
                    const shift = -0.35 + factor * 0.75;
                    result.push(adjustLightness(baseColor2, shift));
                }
                break;

            case 'multi-stop-gradient':
                for (let i = 0; i < len; i++) {
                    const factor = len > 1 ? i / (len - 1) : 0;
                    result.push(multiColorInterpolate(colors, factor));
                }
                break;

            default:
                for (let i = 0; i < len; i++) {
                    result.push(colors[i % colors.length]);
                }
        }
        return result;
    }

    function multiColorInterpolate(colors, factor) {
        if (colors.length === 1) return colors[0];
        const segments = colors.length - 1;
        const scaled = factor * segments;
        const idx = Math.min(Math.floor(scaled), segments - 1);
        const frac = scaled - idx;
        return interpolateColor(colors[idx], colors[idx + 1], frac);
    }

    function splitWords(chars) {
        const words = [];
        let current = '';
        for (const ch of chars) {
            if (ch === ' ') {
                if (current) words.push(current);
                words.push(' ');
                current = '';
            } else {
                current += ch;
            }
        }
        if (current) words.push(current);
        return words;
    }

    // ============ FUNCIONES PARA JSON DE NOMBRE ============
    let jsonNameTarget = null;

    window.openJsonNameModal = function(prefix) {
        jsonNameTarget = prefix;
        const modal = document.getElementById('jsonNameModal');
        document.getElementById('jsonNameInput').value = '';
        modal.showModal();
    };

    window.closeJsonNameModal = function() {
        document.getElementById('jsonNameModal').close();
        jsonNameTarget = null;
    };

    window.applyJsonName = function() {
        const input = document.getElementById('jsonNameInput');
        const raw = input.value.trim();
        if (!raw) {
            alert('Por favor, pega un JSON válido.');
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                alert('El JSON debe ser un array de objetos.');
                return;
            }
            let fullText = '';
            const colors = [];
            for (const item of parsed) {
                if (typeof item.text !== 'string') {
                    alert('Cada objeto debe tener una propiedad "text" de tipo string.');
                    return;
                }
                fullText += item.text;
                if (item.color) {
                    colors.push(item.color);
                } else {
                    colors.push('#ffffff');
                }
            }
            if (!jsonNameTarget) {
                alert('No se ha seleccionado una variante.');
                return;
            }
            const target = getTargetByPrefix(jsonNameTarget);
            if (!target) {
                alert('No se encontró la variante objetivo.');
                return;
            }
            target.nameConfig.name = fullText;
            target.nameConfig.advancedMode = true;
            target.nameConfig.advancedColors = colors;
            structuralChange();
            updateAdvancedPreview(target, jsonNameTarget);
            closeJsonNameModal();
        } catch (e) {
            alert('Error al parsear JSON: ' + e.message);
        }
    };

    // ============ FIN FUNCIONES JSON ============

    function createEmptyNameConfig() {
        return {
            name: '',
            colorMode: 'single',
            singleColor: '#ffffff',
            letterColors: [],
            bold: false,
            visibleDistance: 10,
            advancedMode: false,
            advancedColors: ['#00ccff', '#ffee00'],
            advancedStyle: 'gradient'
        };
    }

    function createEmptyCreeperConfig() { return { powered: false, fuse: '30', fuseUnit: 'ticks', explosionRadius: 3 }; }

    function createEmptyCustom() {
        return {
            equipment: createEmptyEquipment(),
            effects: [],
            attributes: [],
            nameConfig: createEmptyNameConfig(),
            creeperConfig: null,
            sizeConfig: null,
            areaEffects: [],
            arrowKillEffects: []
        };
    }

    function initVariants(count) {
        state.numVariants = count;
        state.variants = [];
        let prevMax = 0;
        const defaultType = entityTypes[0] || 'zombie';
        for (let i = 0; i < count; i++) {
            state.variants.push({
                min: prevMax + 1,
                max: prevMax + 1,
                replace: false,
                replaceConfig: { mode: 'single', mobs: [{ type: defaultType, option: 'universal', custom: createEmptyCustom() }] },
                equipment: createEmptyEquipment(),
                effects: [],
                attributes: [],
                nameConfig: createEmptyNameConfig(),
                creeperConfig: null,
                sizeConfig: null,
                areaEffects: [],
                arrowKillEffects: []
            });
            prevMax++;
        }
        state.activeVariantTab = 0;
    }

    const numVariantsInput = document.getElementById('numVariants');
    const cleanItemsCheck = document.getElementById('cleanItems');
    const outputTextarea = document.getElementById('outputCode');
    const mobSummary = document.getElementById('mobSummary');
    const variantRangesDiv = document.getElementById('variantRanges');
    const rangeValidationDiv = document.getElementById('rangeValidation');
    const variantTabsDiv = document.getElementById('variantTabs');
    const variantTabContentsDiv = document.getElementById('variantTabContents');
    const mobInput = document.getElementById('mobInput');
    const addMobBtn = document.getElementById('addMobBtn');
    const mobList = document.getElementById('mobList');

    function getAbbrGroups() {
        const groups = {};
        for (const [mobId, sel] of Object.entries(state.mobSelections)) {
            if (sel.selected && sel.abbr.length === 2) {
                if (!groups[sel.abbr]) groups[sel.abbr] = [];
                groups[sel.abbr].push(mobId);
            }
        }
        return groups;
    }

    function getFirstAbbr() {
        const selected = Object.entries(state.mobSelections).filter(([, v]) => v.selected).map(([id]) => id);
        if (selected.length === 0) return 'xx';
        return state.mobSelections[selected[0]]?.abbr || 'xx';
    }

    function hasCreeperInBase() { return Object.entries(state.mobSelections).some(([id, sel]) => sel.selected && id === 'creeper'); }

    function isOnlyCreeper() {
        const selected = Object.entries(state.mobSelections).filter(([, v]) => v.selected).map(([id]) => id);
        return selected.length === 1 && selected[0] === 'creeper';
    }

    function isMobCreeper(mobType) { return mobType === 'creeper'; }

    function isMobSlime(mobType) { return mobType === 'slime' || mobType === 'magma_cube'; }

    function isMobPhantom(mobType) { return mobType === 'phantom'; }

    function hasSizeMobsInBase() {
        const selected = Object.entries(state.mobSelections).filter(([, v]) => v.selected).map(([id]) => id);
        return selected.some(id => isMobSlime(id) || isMobPhantom(id));
    }

    function hexToDecimal(hex) { return parseInt(hex.replace('#', ''), 16); }

    function updateCodeOnly() { generateCode();
        autoSave(); }

    function fullRender() {
        renderMobSummary();
        renderVariantRanges();
        renderVariantTabs();
        updateRangeValidation();
        generateCode();
        renderMobList();
        syncUIFromState();
    }

    function structuralChange() {
        const ds = saveDetailsState();
        fullRender();
        restoreDetailsState(ds);
        autoSave();
    }

    function saveDetailsState() {
        const details = variantTabContentsDiv.querySelectorAll('details');
        return Array.from(details).map((d, i) => ({ index: i, open: d.open }));
    }

    function restoreDetailsState(st) {
        const details = variantTabContentsDiv.querySelectorAll('details');
        st.forEach(s => { if (s.index < details.length) details[s.index].open = s.open; });
    }

    function renderMobList() {
        const selected = Object.entries(state.mobSelections).filter(([, v]) => v.selected).map(([id]) => id);
        mobList.innerHTML = selected.map(id =>
            `<span class="mob-pill">${id} (${state.mobSelections[id].abbr}) <button type="button" data-remove="${id}" style="margin-left:4px; cursor:pointer;">×</button></span>`
        ).join('');
        mobList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.remove;
                if (state.mobSelections[id]) state.mobSelections[id].selected = false;
                updateAllAbbreviations();
                structuralChange();
            });
        });
    }

    function addMob(id) {
        if (!id.trim()) return;
        const cleanId = id.trim();
        if (!state.mobSelections[cleanId]) state.mobSelections[cleanId] = { selected: false, abbr: '' };
        state.mobSelections[cleanId].selected = true;
        updateAllAbbreviations();
        mobInput.value = '';
        structuralChange();
    }

    addMobBtn.addEventListener('click', () => addMob(mobInput.value));
    mobInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault();
            addMob(mobInput.value); } });

    // ============ GESTIÓN DE VARIANTES ============
    function duplicateVariant(idx) {
        const copy = JSON.parse(JSON.stringify(state.variants[idx]));
        state.variants.splice(idx + 1, 0, copy);
        state.numVariants = state.variants.length;
        recalcRanges();
        state.activeVariantTab = Math.min(idx + 1, state.variants.length - 1);
        structuralChange();
    }

    function moveVariantUp(idx) {
        if (idx <= 0) return;
        [state.variants[idx - 1], state.variants[idx]] = [state.variants[idx], state.variants[idx - 1]];
        recalcRanges();
        state.activeVariantTab = idx - 1;
        structuralChange();
    }

    function moveVariantDown(idx) {
        if (idx >= state.variants.length - 1) return;
        [state.variants[idx], state.variants[idx + 1]] = [state.variants[idx + 1], state.variants[idx]];
        recalcRanges();
        state.activeVariantTab = idx + 1;
        structuralChange();
    }

    function copyVariant(idx) { clipboardVariant = JSON.parse(JSON.stringify(state.variants[idx]));
        clipboardAction = 'copy'; }

    function cutVariant(idx) {
        clipboardVariant = JSON.parse(JSON.stringify(state.variants[idx]));
        clipboardAction = 'cut';
        state.variants.splice(idx, 1);
        state.numVariants = state.variants.length;
        recalcRanges();
        if (state.variants.length === 0) initVariants(1);
        state.activeVariantTab = Math.min(idx, state.variants.length - 1);
        structuralChange();
    }

    function pasteVariant(idx) {
        if (!clipboardVariant) return;
        const pasteCopy = JSON.parse(JSON.stringify(clipboardVariant));
        state.variants.splice(idx + 1, 0, pasteCopy);
        state.numVariants = state.variants.length;
        recalcRanges();
        if (clipboardAction === 'cut') { clipboardVariant = null;
            clipboardAction = null; }
        state.activeVariantTab = Math.min(idx + 1, state.variants.length - 1);
        structuralChange();
    }

    function recalcRanges() {
        let prevMax = 0;
        for (let i = 0; i < state.variants.length; i++) {
            state.variants[i].min = prevMax + 1;
            if (state.variants[i].max < state.variants[i].min) state.variants[i].max = state.variants[i].min;
            prevMax = state.variants[i].max;
        }
    }

    function goToVariant(num) {
        const idx = parseInt(num) - 1;
        if (idx >= 0 && idx < state.variants.length) switchVariantTab(idx);
        else alert('Número de variante inválido.');
    }

    // ============ GENERACIÓN DE CÓDIGO ============
    function generateCode() {
        outputTextarea.value = generateCodeForFile();
    }

    function hasAnyContent(v) {
        const eq = v.equipment;
        for (const s of ['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet'])
            if (eq[s].item || eq[s].enchants.length) return true;
        if (v.effects.length || v.attributes.length || v.nameConfig.name.trim()) return true;
        if (v.sizeConfig && v.sizeConfig.enabled) return true;
        if (v.areaEffects && v.areaEffects.length) return true;
        if (v.arrowKillEffects && v.arrowKillEffects.length) return true;
        return false;
    }

    function genCmds(lines, custom, tc, tb, abbr, isCreeperMob) {
        const eq = custom.equipment,
            eff = custom.effects,
            attr = custom.attributes,
            nc = custom.nameConfig;
        const slots = [{ k: 'mainhand', s: 'weapon.mainhand' }, { k: 'offhand', s: 'weapon.offhand' }, { k: 'head', s: 'armor.head' }, { k: 'chest', s: 'armor.chest' }, { k: 'legs', s: 'armor.legs' }, { k: 'feet', s: 'armor.feet' }];
        slots.forEach(sl => {
            const e = eq[sl.k];
            if (!e.item) return;
            let istr = e.item.includes(':') ? e.item : `minecraft:${e.item}`;
            let comp = [`minecraft:custom_model_data=${e.cmd}`];
            const en = {};
            e.enchants.forEach(ec => { if (ec.name) en[ec.name] = ec.level; });
            comp.push(`minecraft:enchantments={${Object.entries(en).map(([k, v]) => `${k}:${v}`).join(',')}}`);
            if (e.unbreakable) comp.push(`minecraft:unbreakable={}`);
            if (e.color && e.item.includes('leather')) comp.push(`minecraft:dyed_color=${hexToDecimal(e.color)}`);
            lines.push(`item replace entity @e[tag=${tc},tag=!${tb}] ${sl.s} with ${istr}[${comp.join(',')}]`);
        });
        if (nc.name.trim()) {
            const jn = buildNameJson(nc);
            lines.push(`execute as @e[tag=${tc},tag=!${tb}] run data merge entity @s {CustomName:'${jn}',CustomNameVisible:1b}`);
            lines.push(`execute as @e[tag=${tc}] at @s unless entity @a[distance=..${nc.visibleDistance}] run data merge entity @s {CustomNameVisible:0b}`);
            lines.push(`execute as @e[tag=${tc}] at @s if entity @a[distance=..${nc.visibleDistance}] run data merge entity @s {CustomNameVisible:1b}`);
            lines.push('');
        }
        attr.forEach(at => {
            if (at.name) {
                const an = at.name.includes(':') ? at.name : `minecraft:${at.name}`;
                lines.push(`execute as @e[tag=${tc},tag=!${tb}] run attribute @s ${an} base set ${at.value || 1}`);
            }
        });
        if (attr.length) lines.push('');
        if (isCreeperMob && custom.creeperConfig) {
            const cc = custom.creeperConfig;
            const fuse = cc.fuseUnit === 'seconds' ? `${parseInt(cc.fuse) * 20 || 30}s` : `${cc.fuse || 30}s`;
            const powered = cc.powered ? '1b' : '0b';
            const explosion = `${cc.explosionRadius || 3}b`;
            lines.push(`execute as @e[tag=${tc},tag=!${tb}] run data merge entity @s {powered:${powered},Fuse:${fuse},ExplosionRadius:${explosion}}`);
        }
        if (custom.sizeConfig && custom.sizeConfig.enabled) {
            lines.push(`execute as @e[tag=${tc},tag=!${tb}] run data merge entity @s {Size:${custom.sizeConfig.size}}`);
        }

        if (custom.areaEffects && custom.areaEffects.length) {
            custom.areaEffects.forEach(ae => {
                if (ae.effect) {
                    const effName = ae.effect.includes(':') ? ae.effect : `minecraft:${ae.effect}`;
                    const duration = ae.duration || 10;
                    const amplifier = ae.amplifier !== undefined ? ae.amplifier : 0;
                    const distance = ae.distance || 3;
                    lines.push(`execute as @e[tag=${tc}] at @s as @a[distance=..${distance}] run effect give @s ${effName} ${duration} ${amplifier} true`);
                }
            });
            lines.push('');
        }

        if (custom.arrowKillEffects && custom.arrowKillEffects.length) {
            custom.arrowKillEffects.forEach(ake => {
                const entity = ake.entityType || 'minecraft:arrow';
                const dist = ake.distance || 5;
                lines.push(`execute as @e[tag=${tc}] at @s run kill @e[type=${entity},distance=..${dist}]`);
            });
            lines.push('');
        }

        if (!isCreeperMob) {
            eff.forEach(ef => {
                if (ef.name) {
                    const en = ef.name.includes(':') ? ef.name : `minecraft:${ef.name}`;
                    // === CORRECCIÓN: respetar el valor 0 del amplificador ===
                    const amp = (ef.amplifier !== undefined && ef.amplifier !== null) ? ef.amplifier : 1;
                    lines.push(`effect give @e[tag=${tc},tag=!${tb}] ${en} ${ef.duration || 'infinite'} ${amp} ${!ef.particles ? 'true' : ''}`.trim());
                }
            });
            if (eff.length) lines.push('');
            lines.push(`tag @e[tag=${tc},tag=!${tb}] add ${tb}`);
        } else {
            lines.push(`tag @e[tag=${tc},tag=!${tb}] add ${tb}`);
            eff.forEach(ef => {
                if (ef.name) {
                    const en = ef.name.includes(':') ? ef.name : `minecraft:${ef.name}`;
                    const amp = (ef.amplifier !== undefined && ef.amplifier !== null) ? ef.amplifier : 1;
                    lines.push(`effect give @e[tag=${tc}] ${en} ${ef.duration || '1'} ${amp} ${!ef.particles ? 'true' : ''}`.trim());
                }
            });
        }
        lines.push('');
    }

    function buildNameJson(nc) {
        if (nc.advancedMode && nc.advancedColors && nc.advancedColors.length > 0) {
            const colors = generateColors(nc.name, nc.advancedColors, nc.advancedStyle || 'gradient');
            const parts = [];
            const chars = [...nc.name];
            for (let i = 0; i < chars.length; i++) {
                const ch = chars[i];
                const escaped = ch === '"' ? '\\"' : ch;
                parts.push({ text: escaped, color: colors[i] || '#ffffff', bold: nc.bold || false });
            }
            return JSON.stringify(parts);
        } else {
            const name = nc.name,
                bold = nc.bold,
                base = { text: '', bold: bold, italic: false };
            if (nc.colorMode === 'single') {
                base.extra = name.split('').map(ch => ({ text: ch, color: nc.singleColor || '#ffffff' }));
            } else {
                base.extra = name.split('').map((ch, i) => ({ text: ch, color: nc.letterColors[i] || '#ffffff' }));
            }
            return JSON.stringify(base);
        }
    }

    function renderMobSummary() {
        const groups = getAbbrGroups();
        if (!Object.keys(groups).length) { mobSummary.textContent = 'No hay mobs configurados.'; return; }
        let h = 'Mobs configurados: ';
        const p = [];
        for (const [a, mobs] of Object.entries(groups)) p.push(`<strong>${a}</strong> → ${mobs.join(', ')} (scoreboard: c${a})`);
        mobSummary.innerHTML = h + p.join(' | ');
    }

    function renderVariantRanges() {
        const abbr = getFirstAbbr();
        const count = state.variants.length;
        let html = '';
        if (count > 5) {
            html += '<div class="range-scroll">';
            html += state.variants.map((v, i) =>
                `<div>Var ${i+1}: <input type="number" value="${v.min}" min="1" data-variant="${i}" data-field="min" style="width:60px;"> .. <input type="number" value="${v.max}" min="1" data-variant="${i}" data-field="max" style="width:60px;"> tag: ${abbr}c${i+1}</div>`
            ).join('');
            html += '</div>';
        } else {
            html += state.variants.map((v, i) =>
                `<div>Variante ${i + 1}: rango <input type="number" value="${v.min}" min="1" data-variant="${i}" data-field="min" style="width:60px;"> .. <input type="number" value="${v.max}" min="1" data-variant="${i}" data-field="max" style="width:60px;"> → tag: ${abbr}c${i + 1}</div>`
            ).join('');
        }
        variantRangesDiv.innerHTML = html;
        variantRangesDiv.querySelectorAll('input').forEach(inp => inp.addEventListener('change', function() { updateVariantRange(parseInt(this.dataset.variant), this.dataset.field, parseInt(this.value) || 1); }));
    }

    function updateVariantRange(idx, field, value) {
        const val = Math.max(1, value);
        state.variants[idx][field] = val;
        if (field === 'max' && idx < state.variants.length - 1) { state.variants[idx + 1].min = state.variants[idx].max + 1; if (state.variants[idx + 1].max < state.variants[idx + 1].min) state.variants[idx + 1].max = state.variants[idx + 1].min; }
        if (field === 'min' && idx > 0) { state.variants[idx - 1].max = state.variants[idx].min - 1; if (state.variants[idx - 1].max < state.variants[idx - 1].min) { state.variants[idx - 1].max = state.variants[idx - 1].min;
                state.variants[idx].min = state.variants[idx - 1].max + 1; } }
        if (idx === 0 && field === 'min') state.variants[0].min = 1;
        structuralChange();
    }

    function updateRangeValidation() {
        let ok = true;
        for (let i = 0; i < state.variants.length; i++) { const v = state.variants[i]; if (v.min > v.max) { ok = false; break; } if (i > 0 && v.min !== state.variants[i - 1].max + 1) { ok = false; break; } if (i === 0 && v.min !== 1) { ok = false; break; } }
        rangeValidationDiv.textContent = ok ? '✅ Rangos válidos y consecutivos.' : '⚠️ Rangos deben ser consecutivos y empezar en 1.';
    }

    function renderVariantTabs() {
        const abbr = getFirstAbbr();
        const count = state.variants.length;
        let html = '';
        if (count > 5) {
            html += `<label>Variante:</label> <select id="variantSelect">${state.variants.map((v, i) => `<option value="${i}" ${state.activeVariantTab === i ? 'selected' : ''}>Var ${i + 1} (${abbr}c${i + 1})</option>`).join('')}</select>`;
        } else {
            html += state.variants.map((v, i) => `<button data-tab="${i}" ${state.activeVariantTab === i ? 'disabled' : ''}>Var ${i + 1} (${abbr}c${i + 1})</button>`).join('');
        }
        html += ` <span>Ir a: <input type="number" id="gotoVariantInput" min="1" max="${count}" style="width:50px;"> <button id="gotoVariantBtn">Ir</button></span>`;
        variantTabsDiv.innerHTML = html;
        const select = document.getElementById('variantSelect');
        if (select) select.addEventListener('change', function() { switchVariantTab(parseInt(this.value)); });
        variantTabsDiv.querySelectorAll('button[data-tab]').forEach(b => b.addEventListener('click', function() { switchVariantTab(parseInt(this.dataset.tab)); }));
        document.getElementById('gotoVariantBtn').addEventListener('click', function() { goToVariant(document.getElementById('gotoVariantInput').value); });
        document.getElementById('gotoVariantInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') goToVariant(this.value); });
        renderVariantTabContent();
    }

    function switchVariantTab(idx) { state.activeVariantTab = idx;
        renderVariantTabs(); }

    function renderVariantTabContent() {
        const idx = state.activeVariantTab,
            v = state.variants[idx] || state.variants[0];
        if (!v) { variantTabContentsDiv.innerHTML = ''; return; }
        variantTabContentsDiv.innerHTML = renderVariantConfig(idx, v, getFirstAbbr());
    }

    function renderVariantConfig(idx, v, abbr) {
        const tb = `${abbr}c${idx + 1}`;
        let tools = `<div class="variant-tools">`;
        tools += `<button type="button" data-action="duplicate" data-idx="${idx}">📋 Duplicar</button>`;
        if (idx > 0) tools += `<button type="button" data-action="moveUp" data-idx="${idx}">⬆️ Subir</button>`;
        if (idx < state.variants.length - 1) tools += `<button type="button" data-action="moveDown" data-idx="${idx}">⬇️ Bajar</button>`;
        tools += `<button type="button" data-action="copy" data-idx="${idx}">📄 Copiar</button>`;
        tools += `<button type="button" data-action="cut" data-idx="${idx}">✂️ Cortar</button>`;
        if (clipboardVariant) tools += `<button type="button" data-action="paste" data-idx="${idx}">📋 Pegar</button>`;
        tools += `</div>`;
        return tools + `<div><label><input type="radio" name="replace${idx}" value="no" ${!v.replace ? 'checked' : ''}> No (normal)</label> <label><input type="radio" name="replace${idx}" value="yes" ${v.replace ? 'checked' : ''}> Sí (reemplazar)</label></div>
                <div id="replaceSection${idx}" style="${v.replace ? '' : 'display:none'}">${renderReplaceConfig(idx, v, abbr)}</div>
                <div id="normalSection${idx}" style="${v.replace ? 'display:none' : ''}">
                    ${renderNormalConfig(idx, v, abbr, tb, v.equipment, v.effects, v.attributes, v.nameConfig, false, 'main-' + idx)}
                    ${hasCreeperInBase() ? renderCreeperConfigMain(idx, v) : ''}
                    ${hasSizeMobsInBase() ? renderSizeConfigMain(idx, v) : ''}
                </div>`;
    }

    function renderReplaceConfig(idx, v, abbr) {
        const rc = v.replaceConfig,
            tb = `${abbr}c${idx + 1}`;
        let h = `<div><h3>Reemplazo - Var ${idx + 1}</h3><label>Mobs:</label> <select data-replace-mode="${idx}"><option value="single" ${rc.mode === 'single' ? 'selected' : ''}>Uno</option><option value="double" ${rc.mode === 'double' ? 'selected' : ''}>Dos apilados</option></select>`;
        const labels = rc.mode === 'double' ? [`Abajo (${tb}r1)`, `Arriba (${tb}r2)`] : ['Mob'];
        while (rc.mobs.length < labels.length) rc.mobs.push({ type: entityTypes[0] || 'zombie', option: 'universal', custom: createEmptyCustom() });
        while (rc.mobs.length > labels.length) rc.mobs.pop();
        rc.mobs.forEach((mob, mi) => {
            const up = `rc-${idx}-${mi}`,
                rt = rc.mode === 'double' ? `${tb}r${mi + 1}` : tb;
            h += `<div style="border:1px solid #ccc; margin:4px; padding:4px;"><strong>${labels[mi]}</strong><br>
                        <label>Tipo:</label> <input type="text" value="${mob.type}" list="mobsList" data-replace-mob-type="${idx}-${mi}" style="width:140px;" autocomplete="off">
                        <label>Opción:</label> <select data-replace-mob-option="${idx}-${mi}"><option value="universal" ${mob.option === 'universal' ? 'selected' : ''}>Universal</option><option value="simple" ${mob.option === 'simple' ? 'selected' : ''}>Simple</option><option value="custom" ${mob.option === 'custom' ? 'selected' : ''}>Custom</option></select>
                        <div data-replace-custom="${idx}-${mi}" style="${mob.option === 'custom' ? '' : 'display:none'}">
                            ${renderNormalConfig(idx, v, abbr, rt, mob.custom.equipment, mob.custom.effects, mob.custom.attributes, mob.custom.nameConfig, true, up)}
                            ${isMobCreeper(mob.type) ? renderCreeperConfigReplace(idx, mi, mob.custom) : ''}
                            ${(isMobSlime(mob.type) || isMobPhantom(mob.type)) ? renderSizeConfigReplace(idx, mi, mob.custom) : ''}
                        </div>
                    </div>`;
        });
        return h + '</div>';
    }

    function renderCreeperConfigMain(idx, v) {
        if (!v.creeperConfig) v.creeperConfig = createEmptyCreeperConfig();
        const cc = v.creeperConfig;
        const prefix = `main-${idx}`;
        return `<div class="creeper-config"><strong>Configuración de Creeper (modo normal)</strong><br>
                    <label>Powered: <input type="checkbox" ${cc.powered ? 'checked' : ''} data-field="creeperPowered" data-prefix="${prefix}"></label>
                    <label>Fuse: <input type="number" value="${cc.fuse}" min="0" style="width:60px;" data-field="creeperFuse" data-prefix="${prefix}"></label>
                    <select data-field="creeperFuseUnit" data-prefix="${prefix}"><option value="ticks" ${cc.fuseUnit === 'ticks' ? 'selected' : ''}>ticks</option><option value="seconds" ${cc.fuseUnit === 'seconds' ? 'selected' : ''}>segundos</option></select>
                    <label>ExplosionRadius: <input type="number" value="${cc.explosionRadius}" min="0" style="width:60px;" data-field="creeperExplosionRadius" data-prefix="${prefix}"></label>
                </div>`;
    }

    function renderCreeperConfigReplace(vIdx, mIdx, custom) {
        const cc = custom.creeperConfig || createEmptyCreeperConfig();
        if (!custom.creeperConfig) custom.creeperConfig = cc;
        const prefix = `rc-${vIdx}-${mIdx}`;
        return `<div class="creeper-config"><strong>Configuración de Creeper</strong><br>
                    <label>Powered: <input type="checkbox" ${cc.powered ? 'checked' : ''} data-field="creeperPowered" data-prefix="${prefix}"></label>
                    <label>Fuse: <input type="number" value="${cc.fuse}" min="0" style="width:60px;" data-field="creeperFuse" data-prefix="${prefix}"></label>
                    <select data-field="creeperFuseUnit" data-prefix="${prefix}"><option value="ticks" ${cc.fuseUnit === 'ticks' ? 'selected' : ''}>ticks</option><option value="seconds" ${cc.fuseUnit === 'seconds' ? 'selected' : ''}>segundos</option></select>
                    <label>ExplosionRadius: <input type="number" value="${cc.explosionRadius}" min="0" style="width:60px;" data-field="creeperExplosionRadius" data-prefix="${prefix}"></label>
                </div>`;
    }

    function renderSizeConfigMain(idx, v) {
        if (!v.sizeConfig) v.sizeConfig = { enabled: false, size: 1 };
        const sc = v.sizeConfig;
        const prefix = `main-${idx}`;
        return `<div class="size-config" style="margin-top:8px;border-top:1px solid #ccc;padding-top:8px;">
                    <label><input type="checkbox" data-field="sizeEnabled" data-prefix="${prefix}" ${sc.enabled ? 'checked' : ''}> Tamaño personalizado</label>
                    <div style="${sc.enabled ? '' : 'display:none'}">
                        <label>Tamaño: <input type="number" value="${sc.size}" min="1" data-field="sizeValue" data-prefix="${prefix}"></label>
                    </div>
                </div>`;
    }

    function renderSizeConfigReplace(vIdx, mIdx, custom) {
        if (!custom.sizeConfig) custom.sizeConfig = { enabled: false, size: 1 };
        const sc = custom.sizeConfig;
        const prefix = `rc-${vIdx}-${mIdx}`;
        return `<div class="size-config" style="margin-top:8px;border-top:1px solid #ccc;padding-top:8px;">
                    <label><input type="checkbox" data-field="sizeEnabled" data-prefix="${prefix}" ${sc.enabled ? 'checked' : ''}> Tamaño personalizado</label>
                    <div style="${sc.enabled ? '' : 'display:none'}">
                        <label>Tamaño: <input type="number" value="${sc.size}" min="1" data-field="sizeValue" data-prefix="${prefix}"></label>
                    </div>
                </div>`;
    }

    // ============ RENDER NORMAL ============
    function renderNormalConfig(idx, v, abbr, tb, equipment, effects, attributes, nameConfig, isReplaceCustom = false, uniquePrefix = '') {
        const prefix = uniquePrefix || (isReplaceCustom ? `rc-${idx}` : `main-${idx}`);
        const onlyCreeper = isOnlyCreeper() && !isReplaceCustom;
        const creeperInBase = hasCreeperInBase() && !isReplaceCustom;
        let h = '';
        h += `<details open><summary>Equipamiento</summary>`;
        const slots = [{ k: 'mainhand', l: 'Mano p.' }, { k: 'offhand', l: 'Mano s.' }, { k: 'head', l: 'Casco' }, { k: 'chest', l: 'Pechera' }, { k: 'legs', l: 'Pantalón' }, { k: 'feet', l: 'Botas' }];
        slots.forEach(sl => {
            const eq = equipment[sl.k],
                isLeather = eq.item && eq.item.includes('leather');
            h += `<div><span>${sl.l}</span> <input type="text" value="${escapeHtml(eq.item)}" list="itemsList" data-field="item" data-prefix="${prefix}" data-slot="${sl.k}" style="width:140px;"> CMD: <input type="number" value="${eq.cmd}" min="0" style="width:50px;" data-field="cmd" data-prefix="${prefix}" data-slot="${sl.k}"> Unbreak: <input type="checkbox" ${eq.unbreakable ? 'checked' : ''} data-field="unbreakable" data-prefix="${prefix}" data-slot="${sl.k}"> <span data-leather-color="${prefix}-${sl.k}" style="${isLeather ? '' : 'display:none'}">Color: <input type="color" value="${eq.color || '#ffffff'}" data-field="color" data-prefix="${prefix}" data-slot="${sl.k}"></span> <button type="button" data-action="addEnchant" data-prefix="${prefix}" data-slot="${sl.k}">+Encant</button> <span>${eq.enchants.map(e => e.name + ':' + e.level).join(', ')}</span></div>`;
            const enchKey = `${prefix}-${sl.k}-enchants`;
            const enchPage = getPage(enchKey);
            const totalEnch = eq.enchants.length;
            const maxPageEnch = Math.max(0, Math.ceil(totalEnch / ITEMS_PER_PAGE) - 1);
            const startEnch = enchPage * ITEMS_PER_PAGE;
            const pageEnchants = eq.enchants.slice(startEnch, startEnch + ITEMS_PER_PAGE);
            pageEnchants.forEach((ench, ei) => {
                const realIndex = startEnch + ei;
                h += `<div>Encant: <input type="text" value="${escapeHtml(ench.name)}" list="enchantsList" data-field="enchName" data-prefix="${prefix}" data-slot="${sl.k}" data-index="${realIndex}" style="width:100px;"> Nivel: <input type="number" value="${ench.level}" min="1" style="width:50px;" data-field="enchLevel" data-prefix="${prefix}" data-slot="${sl.k}" data-index="${realIndex}"> <button type="button" data-action="removeEnchant" data-prefix="${prefix}" data-slot="${sl.k}" data-index="${realIndex}">✕</button></div>`;
            });
            if (totalEnch > ITEMS_PER_PAGE) {
                h += `<div class="page-nav">`;
                if (enchPage > 0) h += `<button type="button" data-action="pageEnchant" data-prefix="${prefix}" data-slot="${sl.k}" data-page="${enchPage - 1}">← Anterior</button>`;
                h += ` <span>${enchPage + 1}/${maxPageEnch + 1}</span> `;
                if (enchPage < maxPageEnch) h += `<button type="button" data-action="pageEnchant" data-prefix="${prefix}" data-slot="${sl.k}" data-page="${enchPage + 1}">Siguiente →</button>`;
                h += `</div>`;
            }
        });
        h += `</details><details open><summary>Efectos</summary>`;
        const recMsg = onlyCreeper ? 'Recomendado: duración 1.' : (creeperInBase ? 'Recomendado: duración infinite.' : '');
        if (recMsg) h += `<div class="warning">${recMsg}</div>`;
        const effKey = `${prefix}-effects`;
        const effPage = getPage(effKey);
        const totalEff = effects.length;
        const maxPageEff = Math.max(0, Math.ceil(totalEff / ITEMS_PER_PAGE) - 1);
        const startEff = effPage * ITEMS_PER_PAGE;
        const pageEffects = effects.slice(startEff, startEff + ITEMS_PER_PAGE);
        pageEffects.forEach((eff, ei) => {
            const realIndex = startEff + ei;
            const defaultDur = onlyCreeper ? '1' : 'infinite';
            h += `<div>Efecto: <input type="text" value="${escapeHtml(eff.name)}" list="effectsList" data-field="effName" data-prefix="${prefix}" data-index="${realIndex}" style="width:100px;"> Dur: <input type="text" value="${eff.duration || defaultDur}" style="width:60px;" data-field="effDuration" data-prefix="${prefix}" data-index="${realIndex}"> Amp: <input type="number" value="${eff.amplifier}" min="0" style="width:50px;" data-field="effAmplifier" data-prefix="${prefix}" data-index="${realIndex}"> Part: <input type="checkbox" ${eff.particles ? 'checked' : ''} data-field="effParticles" data-prefix="${prefix}" data-index="${realIndex}"> <button type="button" data-action="removeEffect" data-prefix="${prefix}" data-index="${realIndex}">✕</button></div>`;
        });
        if (totalEff > ITEMS_PER_PAGE) {
            h += `<div class="page-nav">`;
            if (effPage > 0) h += `<button type="button" data-action="pageEffect" data-prefix="${prefix}" data-page="${effPage - 1}">← Anterior</button>`;
            h += ` <span>${effPage + 1}/${maxPageEff + 1}</span> `;
            if (effPage < maxPageEff) h += `<button type="button" data-action="pageEffect" data-prefix="${prefix}" data-page="${effPage + 1}">Siguiente →</button>`;
            h += `</div>`;
        }
        h += `<button type="button" data-action="addEffect" data-prefix="${prefix}">+Añadir efecto</button></details><details open><summary>Atributos</summary>`;
        const attrKey = `${prefix}-attributes`;
        const attrPage = getPage(attrKey);
        const totalAttr = attributes.length;
        const maxPageAttr = Math.max(0, Math.ceil(totalAttr / ITEMS_PER_PAGE) - 1);
        const startAttr = attrPage * ITEMS_PER_PAGE;
        const pageAttrs = attributes.slice(startAttr, startAttr + ITEMS_PER_PAGE);
        pageAttrs.forEach((attr, ai) => {
            const realIndex = startAttr + ai;
            h += `<div>Atributo: <input type="text" value="${escapeHtml(attr.name)}" list="attributesList" data-field="attrName" data-prefix="${prefix}" data-index="${realIndex}" style="width:150px;"> Valor: <input type="number" value="${attr.value}" step="any" style="width:70px;" data-field="attrValue" data-prefix="${prefix}" data-index="${realIndex}"> <button type="button" data-action="removeAttribute" data-prefix="${prefix}" data-index="${realIndex}">✕</button></div>`;
        });
        if (totalAttr > ITEMS_PER_PAGE) {
            h += `<div class="page-nav">`;
            if (attrPage > 0) h += `<button type="button" data-action="pageAttribute" data-prefix="${prefix}" data-page="${attrPage - 1}">← Anterior</button>`;
            h += ` <span>${attrPage + 1}/${maxPageAttr + 1}</span> `;
            if (attrPage < maxPageAttr) h += `<button type="button" data-action="pageAttribute" data-prefix="${prefix}" data-page="${attrPage + 1}">Siguiente →</button>`;
            h += `</div>`;
        }
        h += `<button type="button" data-action="addAttribute" data-prefix="${prefix}">+Añadir atributo</button></details>`;

        // ===== SECCIÓN NOMBRE =====
        h += `<details open><summary>🏷️ Nombre</summary>`;
        const isAdvanced = nameConfig.advancedMode || false;
        h += `<div><label><input type="checkbox" data-field="advancedMode" data-prefix="${prefix}" ${isAdvanced ? 'checked' : ''}> Modo avanzado (colores y degradados)</label></div>`;
        h += `<div><label>Nombre:</label> <input type="text" value="${escapeHtml(nameConfig.name)}" data-field="nameText" data-prefix="${prefix}" style="width:200px;"> <label>Dist:</label> <input type="number" value="${nameConfig.visibleDistance}" min="1" style="width:60px;" data-field="nameDistance" data-prefix="${prefix}"></div>`;
        h += `<div><label><input type="checkbox" ${nameConfig.bold ? 'checked' : ''} data-field="nameBold" data-prefix="${prefix}"> Negrita</label></div>`;
        h += `<div style="margin-top:6px;"><button type="button" onclick="openJsonNameModal('${prefix}')" style="background:#2a4a6a;border:1px solid #4a7a9a;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;">📥 Pegar JSON de nombre</button></div>`;

        if (isAdvanced) {
            const colors = nameConfig.advancedColors || ['#00ccff', '#ffee00'];
            const style = nameConfig.advancedStyle || 'gradient';
            h += `<div style="margin-top:8px;"><strong>Colores:</strong></div><div class="colors-container" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;">`;
            colors.forEach((color, ci) => {
                h += `<div class="color-card" style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:8px;padding:4px 8px;display:flex;align-items:center;gap:4px;">
                        <span style="font-size:0.7rem;color:#99a;">${ci+1}</span>
                        <input type="color" value="${color}" data-field="advancedColor" data-prefix="${prefix}" data-index="${ci}" style="width:32px;height:32px;border:none;padding:0;background:transparent;cursor:pointer;">
                        <button type="button" data-action="removeAdvancedColor" data-prefix="${prefix}" data-index="${ci}" style="background:#3a1020;border:1px solid #5a2030;color:#ff8a9a;border-radius:4px;cursor:pointer;width:24px;height:24px;font-weight:bold;">×</button>
                    </div>`;
            });
            h += `<button type="button" data-action="addAdvancedColor" data-prefix="${prefix}" style="background:#0f3460;border:1px dashed #4a6a9a;color:#b0c0e0;border-radius:8px;padding:4px 12px;cursor:pointer;">+</button>`;
            h += `</div>`;
            h += `<div><label>Estilo:</label> <select data-field="advancedStyle" data-prefix="${prefix}" style="margin-left:4px;">`;
            const styles = [
                ['gradient', 'Degradado lineal'],
                ['gradient-reverse', 'Degradado inverso'],
                ['alternate-cycle', 'Alternancia cíclica'],
                ['symmetric', 'Simétrico (ida y vuelta)'],
                ['per-word', 'Por palabra'],
                ['per-word-gradient', 'Por palabra con degradado'],
                ['light-to-dark', 'Claro → Oscuro'],
                ['dark-to-light', 'Oscuro → Claro'],
                ['multi-stop-gradient', 'Degradado con paradas']
            ];
            styles.forEach(([val, label]) => {
                h += `<option value="${val}" ${style === val ? 'selected' : ''}>${label}</option>`;
            });
            h += `</select></div>`;

            const previewColors = generateColors(nameConfig.name, colors, style);
            const previewChars = [...nameConfig.name];
            h += `<div class="preview-container" data-prefix="${prefix}" style="margin-top:6px;background:#0a0a16;border-radius:8px;padding:6px 10px;min-height:40px;display:flex;flex-wrap:wrap;gap:1px;font-size:1.5rem;font-weight:bold;">`;
            for (let i = 0; i < previewChars.length; i++) {
                const ch = previewChars[i];
                const col = previewColors[i] || '#ffffff';
                h += `<span style="color:${col};">${escapeHtml(ch)}</span>`;
            }
            h += `</div>`;
        } else {
            h += `<div><label><input type="radio" name="colorMode${prefix}" value="single" ${nameConfig.colorMode === 'single' ? 'checked' : ''} data-field="colorMode" data-prefix="${prefix}"> Color único</label> <label><input type="radio" name="colorMode${prefix}" value="perLetter" ${nameConfig.colorMode === 'perLetter' ? 'checked' : ''} data-field="colorMode" data-prefix="${prefix}"> Por letra</label></div>`;
            h += `<div data-single-color="${prefix}" style="${nameConfig.colorMode === 'single' ? '' : 'display:none'}">Color: <input type="color" value="${nameConfig.singleColor}" data-field="singleColor" data-prefix="${prefix}"></div>`;
            const letterColors = nameConfig.letterColors || [];
            h += `<div data-letter-colors="${prefix}" style="${nameConfig.colorMode === 'perLetter' ? '' : 'display:none'}">${nameConfig.name.split('').map((ch, li) => `${escapeHtml(ch)}<input type="color" value="${letterColors[li] || '#ffffff'}" data-field="letterColor" data-prefix="${prefix}" data-index="${li}">`).join('')}</div>`;
        }
        h += `</details>`;

        // ---- Efectos de área ----
        h += `<details open><summary>🎯 Efectos de área (al acercarse)</summary>`;
        const areaKey = `${prefix}-areaEffects`;
        const areaPage = getPage(areaKey);
        const totalArea = (v.areaEffects || []).length;
        const maxPageArea = Math.max(0, Math.ceil(totalArea / ITEMS_PER_PAGE) - 1);
        const startArea = areaPage * ITEMS_PER_PAGE;
        const pageArea = (v.areaEffects || []).slice(startArea, startArea + ITEMS_PER_PAGE);
        pageArea.forEach((ae, ai) => {
            const realIndex = startArea + ai;
            h += `<div>Efecto: <input type="text" value="${escapeHtml(ae.effect || '')}" list="effectsList" data-field="areaEffectName" data-prefix="${prefix}" data-index="${realIndex}" style="width:100px;"> Dist: <input type="number" value="${ae.distance || 3}" min="1" style="width:50px;" data-field="areaEffectDist" data-prefix="${prefix}" data-index="${realIndex}"> Dur: <input type="number" value="${ae.duration || 10}" min="0" style="width:50px;" data-field="areaEffectDur" data-prefix="${prefix}" data-index="${realIndex}"> Amp: <input type="number" value="${ae.amplifier || 0}" min="0" style="width:50px;" data-field="areaEffectAmp" data-prefix="${prefix}" data-index="${realIndex}"> <button type="button" data-action="removeAreaEffect" data-prefix="${prefix}" data-index="${realIndex}">✕</button></div>`;
        });
        if (totalArea > ITEMS_PER_PAGE) {
            h += `<div class="page-nav">`;
            if (areaPage > 0) h += `<button type="button" data-action="pageAreaEffect" data-prefix="${prefix}" data-page="${areaPage - 1}">← Anterior</button>`;
            h += ` <span>${areaPage + 1}/${maxPageArea + 1}</span> `;
            if (areaPage < maxPageArea) h += `<button type="button" data-action="pageAreaEffect" data-prefix="${prefix}" data-page="${areaPage + 1}">Siguiente →</button>`;
            h += `</div>`;
        }
        h += `<button type="button" data-action="addAreaEffect" data-prefix="${prefix}">+Añadir efecto de área</button></details>`;

        // ---- Eliminación de flechas/entidades ----
        h += `<details open><summary>🏹 Eliminación de entidades (flechas)</summary>`;
        const arrowKey = `${prefix}-arrowKillEffects`;
        const arrowPage = getPage(arrowKey);
        const totalArrow = (v.arrowKillEffects || []).length;
        const maxPageArrow = Math.max(0, Math.ceil(totalArrow / ITEMS_PER_PAGE) - 1);
        const startArrow = arrowPage * ITEMS_PER_PAGE;
        const pageArrow = (v.arrowKillEffects || []).slice(startArrow, startArrow + ITEMS_PER_PAGE);
        pageArrow.forEach((ak, ai) => {
            const realIndex = startArrow + ai;
            h += `<div>Entidad: <input type="text" value="${escapeHtml(ak.entityType || 'minecraft:arrow')}" list="mobsList" data-field="arrowKillEntity" data-prefix="${prefix}" data-index="${realIndex}" style="width:140px;"> Dist: <input type="number" value="${ak.distance || 5}" min="1" style="width:50px;" data-field="arrowKillDist" data-prefix="${prefix}" data-index="${realIndex}"> <button type="button" data-action="removeArrowKill" data-prefix="${prefix}" data-index="${realIndex}">✕</button></div>`;
        });
        if (totalArrow > ITEMS_PER_PAGE) {
            h += `<div class="page-nav">`;
            if (arrowPage > 0) h += `<button type="button" data-action="pageArrowKill" data-prefix="${prefix}" data-page="${arrowPage - 1}">← Anterior</button>`;
            h += ` <span>${arrowPage + 1}/${maxPageArrow + 1}</span> `;
            if (arrowPage < maxPageArrow) h += `<button type="button" data-action="pageArrowKill" data-prefix="${prefix}" data-page="${arrowPage + 1}">Siguiente →</button>`;
            h += `</div>`;
        }
        h += `<button type="button" data-action="addArrowKill" data-prefix="${prefix}">+Añadir eliminación</button></details>`;

        return h;
    }

    function escapeHtml(s) { const d = document.createElement('div');
        d.textContent = s; return d.innerHTML; }

    function getTargetByPrefix(p) {
        if (p.startsWith('rc-')) { const [, v, m] = p.split('-').map(Number); const vr = state.variants[v]; return vr?.replaceConfig?.mobs[m]?.custom || vr; }
        if (p.startsWith('main-')) { return state.variants[parseInt(p.split('-')[1])]; }
        return null;
    }

    function getEquipmentFromTarget(t, sk) { return t.equipment?.[sk] || t[sk]; }

    // ============ EVENTOS ============
    function globalClickHandler(e) {
        const el = e.target;
        if (!el.dataset.action) return;
        e.preventDefault();
        const a = el.dataset.action,
            p = el.dataset.prefix,
            sk = el.dataset.slot,
            ix = el.dataset.index !== undefined ? parseInt(el.dataset.index) : undefined;
        if (a === 'duplicate') { duplicateVariant(parseInt(el.dataset.idx)); return; }
        if (a === 'moveUp') { moveVariantUp(parseInt(el.dataset.idx)); return; }
        if (a === 'moveDown') { moveVariantDown(parseInt(el.dataset.idx)); return; }
        if (a === 'copy') { copyVariant(parseInt(el.dataset.idx)); return; }
        if (a === 'cut') { cutVariant(parseInt(el.dataset.idx)); return; }
        if (a === 'paste') { pasteVariant(parseInt(el.dataset.idx)); return; }

        if (a === 'pageEnchant') { setPage(`${p}-${sk}-enchants`, parseInt(el.dataset.page));
            structuralChange(); return; }
        if (a === 'pageEffect') { setPage(`${p}-effects`, parseInt(el.dataset.page));
            structuralChange(); return; }
        if (a === 'pageAttribute') { setPage(`${p}-attributes`, parseInt(el.dataset.page));
            structuralChange(); return; }
        if (a === 'pageAreaEffect') { setPage(`${p}-areaEffects`, parseInt(el.dataset.page));
            structuralChange(); return; }
        if (a === 'pageArrowKill') { setPage(`${p}-arrowKillEffects`, parseInt(el.dataset.page));
            structuralChange(); return; }

        const t = getTargetByPrefix(p);
        if (!t) return;

        if (a === 'addEnchant') { getEquipmentFromTarget(t, sk).enchants.push({ name: '', level: 1 });
            structuralChange(); } else if (a === 'removeEnchant') { getEquipmentFromTarget(t, sk).enchants.splice(ix, 1);
            structuralChange(); } else if (a === 'addEffect') {
            const isReplace = p.startsWith('rc-');
            let defaultDur = 'infinite';
            if (!isReplace && isOnlyCreeper()) defaultDur = '1';
            else if (isReplace) {
                const [vIdx, mIdx] = p.split('-').slice(1).map(Number);
                const mob = state.variants[vIdx]?.replaceConfig?.mobs[mIdx];
                if (mob && isMobCreeper(mob.type)) defaultDur = '1';
            }
            t.effects.push({ name: '', duration: defaultDur, amplifier: 0, particles: true });
            structuralChange();
        } else if (a === 'removeEffect') { t.effects.splice(ix, 1);
            structuralChange(); } else if (a === 'addAttribute') { t.attributes.push({ name: '', value: 1 });
            structuralChange(); } else if (a === 'removeAttribute') { t.attributes.splice(ix, 1);
            structuralChange(); } else if (a === 'addAreaEffect') {
            if (!t.areaEffects) t.areaEffects = [];
            t.areaEffects.push({ effect: '', distance: 3, duration: 10, amplifier: 0 });
            structuralChange();
        } else if (a === 'removeAreaEffect') {
            if (t.areaEffects) t.areaEffects.splice(ix, 1);
            structuralChange();
        } else if (a === 'addArrowKill') {
            if (!t.arrowKillEffects) t.arrowKillEffects = [];
            t.arrowKillEffects.push({ entityType: 'minecraft:arrow', distance: 5 });
            structuralChange();
        } else if (a === 'removeArrowKill') {
            if (t.arrowKillEffects) t.arrowKillEffects.splice(ix, 1);
            structuralChange();
        } else if (a === 'addAdvancedColor') {
            const nc = t.nameConfig;
            if (!nc.advancedColors) nc.advancedColors = ['#00ccff', '#ffee00'];
            const last = nc.advancedColors[nc.advancedColors.length - 1] || '#ffffff';
            const newColor = adjustLightness(last, 0.1 + Math.random() * 0.2);
            nc.advancedColors.push(newColor);
            structuralChange();
        } else if (a === 'removeAdvancedColor') {
            const nc = t.nameConfig;
            if (nc.advancedColors && nc.advancedColors.length > 1) {
                nc.advancedColors.splice(ix, 1);
                structuralChange();
            } else {
                alert('Necesitas al menos 1 color.');
            }
        }
    }

    function globalChangeHandler(e) {
        const el = e.target;
        if (el.name?.startsWith('replace')) { state.variants[parseInt(el.name.replace('replace', ''))].replace = el.value === 'yes';
            structuralChange(); return; }
        if (el.dataset.replaceMode !== undefined) { state.variants[parseInt(el.dataset.replaceMode)].replaceConfig.mode = el.value;
            structuralChange(); return; }
        if (el.dataset.replaceMobOption) { const [v, m] = el.dataset.replaceMobOption.split('-').map(Number);
            state.variants[v].replaceConfig.mobs[m].option = el.value;
            structuralChange(); return; }
        if (el.dataset.replaceMobType) {
            const [v, m] = el.dataset.replaceMobType.split('-').map(Number);
            const newType = el.value;
            const mob = state.variants[v].replaceConfig.mobs[m];
            mob.type = newType;
            if (isMobCreeper(newType) && !mob.custom.creeperConfig) mob.custom.creeperConfig = createEmptyCreeperConfig();
            else if (!isMobCreeper(newType)) mob.custom.creeperConfig = null;
            if (isMobSlime(newType) || isMobPhantom(newType)) {
                if (!mob.custom.sizeConfig) mob.custom.sizeConfig = { enabled: false, size: 1 };
            }
            structuralChange(); return;
        }
        if (!el.dataset.field) return;
        const f = el.dataset.field,
            p = el.dataset.prefix;
        const t = getTargetByPrefix(p);
        if (!t) return;
        const sk = el.dataset.slot,
            ix = el.dataset.index !== undefined ? parseInt(el.dataset.index) : undefined;

        if (f === 'sizeEnabled') {
            if (!t.sizeConfig) t.sizeConfig = { enabled: false, size: 1 };
            t.sizeConfig.enabled = el.checked;
            structuralChange();
            return;
        }
        if (f === 'sizeValue') {
            if (!t.sizeConfig) t.sizeConfig = { enabled: false, size: 1 };
            t.sizeConfig.size = parseInt(el.value) || 1;
            updateCodeOnly();
            return;
        }

        if (f.startsWith('creeper')) {
            let cust;
            if (p.startsWith('rc-')) { const [v, m] = p.split('-').slice(1).map(Number);
                cust = state.variants[v].replaceConfig.mobs[m].custom; } else if (p.startsWith('main-')) { cust = state.variants[parseInt(p.split('-')[1])]; }
            if (cust) {
                if (!cust.creeperConfig) cust.creeperConfig = createEmptyCreeperConfig();
                if (f === 'creeperPowered') cust.creeperConfig.powered = el.checked;
                else if (f === 'creeperFuse') cust.creeperConfig.fuse = el.value;
                else if (f === 'creeperFuseUnit') cust.creeperConfig.fuseUnit = el.value;
                else if (f === 'creeperExplosionRadius') cust.creeperConfig.explosionRadius = parseInt(el.value) || 3;
            }
            updateCodeOnly(); return;
        }

        if (f === 'areaEffectName') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].effect = el.value;
            updateCodeOnly(); return;
        }
        if (f === 'areaEffectDist') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].distance = parseInt(el.value) || 3;
            updateCodeOnly(); return;
        }
        if (f === 'areaEffectDur') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].duration = parseInt(el.value) || 10;
            updateCodeOnly(); return;
        }
        if (f === 'areaEffectAmp') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].amplifier = parseInt(el.value) || 0;
            updateCodeOnly(); return;
        }

        if (f === 'arrowKillEntity') {
            if (!t.arrowKillEffects) t.arrowKillEffects = [];
            if (!t.arrowKillEffects[ix]) t.arrowKillEffects[ix] = { entityType: 'minecraft:arrow', distance: 5 };
            t.arrowKillEffects[ix].entityType = el.value;
            updateCodeOnly(); return;
        }
        if (f === 'arrowKillDist') {
            if (!t.arrowKillEffects) t.arrowKillEffects = [];
            if (!t.arrowKillEffects[ix]) t.arrowKillEffects[ix] = { entityType: 'minecraft:arrow', distance: 5 };
            t.arrowKillEffects[ix].distance = parseInt(el.value) || 5;
            updateCodeOnly(); return;
        }

        if (f === 'advancedMode') {
            t.nameConfig.advancedMode = el.checked;
            structuralChange();
            return;
        }
        if (f === 'advancedStyle') {
            t.nameConfig.advancedStyle = el.value;
            updateCodeOnly();
            updateAdvancedPreview(t, p);
            return;
        }
        if (f === 'advancedColor') {
            if (!t.nameConfig.advancedColors) t.nameConfig.advancedColors = ['#00ccff', '#ffee00'];
            if (ix !== undefined && ix < t.nameConfig.advancedColors.length) {
                t.nameConfig.advancedColors[ix] = el.value;
                updateCodeOnly();
                updateAdvancedPreview(t, p);
            }
            return;
        }

        if (f === 'item') { getEquipmentFromTarget(t, sk).item = el.value;
            updateCodeOnly(); } else if (f === 'cmd') { getEquipmentFromTarget(t, sk).cmd = parseInt(el.value) || 100;
            updateCodeOnly(); } else if (f === 'unbreakable') { getEquipmentFromTarget(t, sk).unbreakable = el.checked;
            updateCodeOnly(); } else if (f === 'color') { getEquipmentFromTarget(t, sk).color = el.value;
            updateCodeOnly(); } else if (f === 'enchName') { getEquipmentFromTarget(t, sk).enchants[ix].name = el.value;
            updateCodeOnly(); } else if (f === 'enchLevel') { getEquipmentFromTarget(t, sk).enchants[ix].level = parseInt(el.value) || 1;
            updateCodeOnly(); } else if (f === 'effName') { t.effects[ix].name = el.value;
            updateCodeOnly(); } else if (f === 'effDuration') { t.effects[ix].duration = el.value;
            updateCodeOnly(); } else if (f === 'effAmplifier') { t.effects[ix].amplifier = parseInt(el.value) || 0;
            updateCodeOnly(); } else if (f === 'effParticles') { t.effects[ix].particles = el.checked;
            updateCodeOnly(); } else if (f === 'attrName') { t.attributes[ix].name = el.value;
            updateCodeOnly(); } else if (f === 'attrValue') { t.attributes[ix].value = parseFloat(el.value) || 1;
            updateCodeOnly(); } else if (f === 'nameText') {
            t.nameConfig.name = el.value;
            updateCodeOnly();
            if (t.nameConfig.advancedMode) updateAdvancedPreview(t, p);
        } else if (f === 'nameDistance') { t.nameConfig.visibleDistance = parseInt(el.value) || 10;
            updateCodeOnly(); } else if (f === 'colorMode') { t.nameConfig.colorMode = el.value;
            structuralChange(); } else if (f === 'singleColor') { t.nameConfig.singleColor = el.value;
            updateCodeOnly(); } else if (f === 'nameBold') { t.nameConfig.bold = el.checked;
            updateCodeOnly(); } else if (f === 'letterColor') { if (!t.nameConfig.letterColors) t.nameConfig.letterColors = [];
            t.nameConfig.letterColors[ix] = el.value;
            updateCodeOnly(); }
    }

    function globalInputHandler(e) {
        const el = e.target;
        if (!el.dataset.field) return;
        const f = el.dataset.field,
            p = el.dataset.prefix,
            t = getTargetByPrefix(p);
        if (!t) return;
        const sk = el.dataset.slot,
            ix = el.dataset.index !== undefined ? parseInt(el.dataset.index) : undefined;

        if (f === 'sizeValue') {
            if (!t.sizeConfig) t.sizeConfig = { enabled: false, size: 1 };
            t.sizeConfig.size = parseInt(el.value) || 1;
            updateCodeOnly();
            return;
        }
        if (f.startsWith('creeper')) {
            let cust;
            if (p.startsWith('rc-')) { const [v, m] = p.split('-').slice(1).map(Number);
                cust = state.variants[v].replaceConfig.mobs[m].custom; } else if (p.startsWith('main-')) { cust = state.variants[parseInt(p.split('-')[1])]; }
            if (cust) {
                if (!cust.creeperConfig) cust.creeperConfig = createEmptyCreeperConfig();
                if (f === 'creeperFuse') cust.creeperConfig.fuse = el.value;
                else if (f === 'creeperExplosionRadius') cust.creeperConfig.explosionRadius = parseInt(el.value) || 3;
            }
            updateCodeOnly(); return;
        }

        if (f === 'areaEffectName') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].effect = el.value;
            updateCodeOnly(); return;
        }
        if (f === 'areaEffectDist') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].distance = parseInt(el.value) || 3;
            updateCodeOnly(); return;
        }
        if (f === 'areaEffectDur') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].duration = parseInt(el.value) || 10;
            updateCodeOnly(); return;
        }
        if (f === 'areaEffectAmp') {
            if (!t.areaEffects) t.areaEffects = [];
            if (!t.areaEffects[ix]) t.areaEffects[ix] = { effect: '', distance: 3, duration: 10, amplifier: 0 };
            t.areaEffects[ix].amplifier = parseInt(el.value) || 0;
            updateCodeOnly(); return;
        }

        if (f === 'arrowKillEntity') {
            if (!t.arrowKillEffects) t.arrowKillEffects = [];
            if (!t.arrowKillEffects[ix]) t.arrowKillEffects[ix] = { entityType: 'minecraft:arrow', distance: 5 };
            t.arrowKillEffects[ix].entityType = el.value;
            updateCodeOnly(); return;
        }
        if (f === 'arrowKillDist') {
            if (!t.arrowKillEffects) t.arrowKillEffects = [];
            if (!t.arrowKillEffects[ix]) t.arrowKillEffects[ix] = { entityType: 'minecraft:arrow', distance: 5 };
            t.arrowKillEffects[ix].distance = parseInt(el.value) || 5;
            updateCodeOnly(); return;
        }

        if (f === 'advancedColor') {
            if (!t.nameConfig.advancedColors) t.nameConfig.advancedColors = ['#00ccff', '#ffee00'];
            if (ix !== undefined && ix < t.nameConfig.advancedColors.length) {
                t.nameConfig.advancedColors[ix] = el.value;
                updateCodeOnly();
                updateAdvancedPreview(t, p);
            }
            return;
        }

        if (f === 'item') { getEquipmentFromTarget(t, sk).item = el.value;
            updateCodeOnly(); } else if (f === 'enchName') { getEquipmentFromTarget(t, sk).enchants[ix].name = el.value;
            updateCodeOnly(); } else if (f === 'effName') { t.effects[ix].name = el.value;
            updateCodeOnly(); } else if (f === 'attrName') { t.attributes[ix].name = el.value;
            updateCodeOnly(); } else if (f === 'nameText') {
            t.nameConfig.name = el.value;
            updateCodeOnly();
            if (t.nameConfig.advancedMode) updateAdvancedPreview(t, p);
        } else if (f === 'cmd') { getEquipmentFromTarget(t, sk).cmd = parseInt(el.value) || 100;
            updateCodeOnly(); } else if (f === 'enchLevel') { getEquipmentFromTarget(t, sk).enchants[ix].level = parseInt(el.value) || 1;
            updateCodeOnly(); } else if (f === 'effDuration') { t.effects[ix].duration = el.value;
            updateCodeOnly(); } else if (f === 'effAmplifier') { t.effects[ix].amplifier = parseInt(el.value) || 0;
            updateCodeOnly(); } else if (f === 'attrValue') { t.attributes[ix].value = parseFloat(el.value) || 1;
            updateCodeOnly(); } else if (f === 'nameDistance') { t.nameConfig.visibleDistance = parseInt(el.value) || 10;
            updateCodeOnly(); } else if (f === 'singleColor') { t.nameConfig.singleColor = el.value;
            updateCodeOnly(); } else if (f === 'letterColor') { if (!t.nameConfig.letterColors) t.nameConfig.letterColors = [];
            t.nameConfig.letterColors[ix] = el.value;
            updateCodeOnly(); }
    }

    function updateAdvancedPreview(target, prefix) {
        const container = document.querySelector(`.preview-container[data-prefix="${prefix}"]`);
        if (!container) return;

        const nc = target.nameConfig;
        const colors = generateColors(nc.name, nc.advancedColors || ['#00ccff', '#ffee00'], nc.advancedStyle || 'gradient');
        const chars = [...nc.name];

        container.innerHTML = '';
        for (let i = 0; i < chars.length; i++) {
            const span = document.createElement('span');
            span.style.color = colors[i] || '#ffffff';
            span.textContent = chars[i];
            container.appendChild(span);
        }
    }

    window.copyCode = () => { outputTextarea.select();
        navigator.clipboard.writeText(outputTextarea.value); };
    window.downloadCode = () => { const b = new Blob([outputTextarea.value], { type: 'text/plain' }); const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'variantes_mobs.mcfunction';
        a.click(); };
    window.switchMainTab = function(tab) {
        document.getElementById('tabConfig').style.display = tab === 'config' ? '' : 'none';
        document.getElementById('tabFiles').style.display = tab === 'files' ? '' : 'none';
        document.getElementById('tabGaleria').style.display = tab === 'galeria' ? '' : 'none';
        document.getElementById('btnConfig').classList.toggle('active', tab === 'config');
        document.getElementById('btnFiles').classList.toggle('active', tab === 'files');
        document.getElementById('btnGaleria').classList.toggle('active', tab === 'galeria');
        if (tab === 'files') {
            saveCurrentState();
            renderFileTree();
        }
        if (tab === 'galeria') {
            galeriaActiveTab = true;
            if (Object.keys(galeriaFilesCache).length === 0) {
                document.getElementById('galeriaContainer').innerHTML = '<em>Escaneando galería...</em>';
                scanGaleria();
            } else {
                renderGaleriaCards();
                scanGaleria();
            }
            startGaleriaPolling();
        } else {
            galeriaActiveTab = false;
            stopGaleriaPolling();
        }
    };

    // ============ GENERACIÓN DE DATAPACK ============
    function buildFunctionPath(name, parentId) {
        let path = '';
        let currentParent = parentId;
        while (currentParent && currentParent !== 'root') {
            const folder = fileSystem.folders[currentParent];
            if (folder) {
                path = folder.name + '/' + path;
                currentParent = folder.parent;
            } else break;
        }
        return (path + name).replace(/\s+/g, '_').replace(/\s/g, '_');
    }

    async function buildDatapackZip(fileIds, includeConfigs = true) {
        const zip = new JSZip();
        zip.file('pack.mcmeta', JSON.stringify({ pack: { pack_format: 48, description: 'Datapack generado por Variantes de Mobs' } }, null, 2));
        zip.file('data/minecraft/tags/function/load.json', JSON.stringify({ values: ['index:load'] }, null, 2));
        zip.file('data/minecraft/tags/function/tick.json', JSON.stringify({ values: ['index:tick'] }, null, 2));

        const allFunctions = {};
        const savedState = {
            mobSelections: { ...state.mobSelections },
            numVariants: state.numVariants,
            variants: JSON.parse(JSON.stringify(state.variants)),
            cleanItems: state.cleanItems,
            activeVariantTab: state.activeVariantTab
        };

        for (const fid of fileIds) {
            const file = fileSystem.files[fid];
            if (!file || !file.data) continue;
            Object.assign(state, file.data);
            if (!state.variants) state.variants = createDefaultVariants();
            const code = generateCodeForFile();
            allFunctions[fid] = { code, name: file.name, parent: file.parent, data: file.data };
        }
        Object.assign(state, savedState);
        state.variants = JSON.parse(JSON.stringify(savedState.variants));

        let loadLines = [];
        const firstId = fileIds[0];
        if (firstId && allFunctions[firstId]) {
            const lines = allFunctions[firstId].code.split('\n');
            for (const line of lines) {
                if (line.startsWith('scoreboard objectives add') || line.startsWith('tag @e[')) {
                    loadLines.push(line);
                } else break;
            }
        }
        zip.file('data/index/function/load.mcfunction', loadLines.join('\n') + '\n');

        let tickLines = [];
        for (const [fid, info] of Object.entries(allFunctions)) {
            const funcPath = buildFunctionPath(info.name, info.parent);
            tickLines.push(`function index:${funcPath}`);
            zip.file(`data/index/function/${funcPath}.mcfunction`, info.code);
        }
        zip.file('data/index/function/tick.mcfunction', tickLines.join('\n') + '\n');

        if (includeConfigs) {
            const configFolder = zip.folder('configs');
            for (const [fid, info] of Object.entries(allFunctions)) {
                const configPath = buildFunctionPath(info.name, info.parent);
                configFolder.file(`${configPath}.json`, JSON.stringify(info.data, null, 2));
            }
        }
        return zip.generateAsync({ type: 'blob' });
    }

    window.downloadDatapack = async function(mode) {
        saveCurrentState();
        if (mode === 'all') {
            const blob = await buildDatapackZip(Object.keys(fileSystem.files), true);
            saveAs(blob, 'datapack_completo.zip');
        }
    };

    function generateCodeForFile() {
        const groups = getAbbrGroups();
        const abbrs = Object.keys(groups);
        state.cleanItems = cleanItemsCheck.checked;
        if (abbrs.length === 0) {
            return '# Selecciona al menos un mob y asígnale una abreviatura de 2 letras.';
        }
        const abbr = abbrs[0];
        const scoreboardName = `c${abbr}`;
        const mobIds = groups[abbr];
        let lines = [];
        lines.push(`scoreboard objectives add ${scoreboardName} dummy`);
        lines.push('');
        mobIds.forEach(mobId => {
            const ft = mobId.includes(':') ? mobId : `minecraft:${mobId}`;
            lines.push(`tag @e[type=${ft},tag=!${abbr},tag=!${abbr}r] add ${abbr}`);
        });
        lines.push('');
        lines.push(`scoreboard players add ${scoreboardName} ${scoreboardName} 1`);
        lines.push('');
        state.variants.forEach((v, i) => {
            const vn = i + 1;
            lines.push(`execute if score ${scoreboardName} ${scoreboardName} matches ${v.min}..${v.max} as @e[tag=${abbr},tag=!mobu,limit=1,sort=random] run tag @s add ${abbr}c${vn}`);
            lines.push(`tag @e[tag=${abbr}c${vn},tag=!mobu] add mobu`);
            lines.push('');
        });
        const onlyCreeper = isOnlyCreeper();
        state.variants.forEach((v, i) => {
            const vn = i + 1,
                tc = `${abbr}c${vn}`,
                tb = `${abbr}c${vn}b`;
            if (v.replace) {
                lines.push(`# ${abbr} custom ${vn} - REEMPLAZO`);
                lines.push(`execute as @e[tag=${tc}] run data merge entity @s {DeathLootTable:""}`);
                const rc = v.replaceConfig,
                    m0 = rc.mobs[0],
                    mt0 = m0.type.includes(':') ? m0.type : `minecraft:${m0.type}`;
                if (rc.mode === 'single') {
                    let se = '';
                    if (m0.option === 'universal') se = `{Tags:["mobu"]}`;
                    else if (m0.option === 'custom') se = `{Tags:["mobu","${tc}r1"]}`;
                    lines.push(`execute as @e[tag=${tc}] at @s run summon ${mt0} ~ ~ ~ ${se}`);
                    lines.push(`kill @e[tag=${tc}]`);
                    lines.push('');
                    if (m0.option === 'custom') genCmds(lines, m0.custom, `${tc}r1`, `${tc}r1b`, abbr, isMobCreeper(m0.type));
                } else {
                    const m1 = rc.mobs[1],
                        mt1 = m1.type.includes(':') ? m1.type : `minecraft:${m1.type}`;
                    let pt = [],
                        rt = [];
                    if (m1.option === 'universal') pt.push(`"mobu"`);
                    else if (m1.option === 'custom') pt.push(`"mobu"`, `"${tc}r2"`);
                    if (m0.option === 'universal') rt.push(`"mobu"`);
                    else if (m0.option === 'custom') rt.push(`"mobu"`, `"${tc}r1"`);
                    const ps = pt.length ? `{id:"${mt1}",Tags:[${pt.join(',')}]}` : `{id:"${mt1}"}`;
                    const ss = rt.length ? `{Tags:[${rt.join(',')}],Passengers:[${ps}]}` : `{Passengers:[${ps}]}`;
                    lines.push(`execute as @e[tag=${tc}] at @s run summon ${mt0} ~ ~ ~ ${ss}`);
                    lines.push(`kill @e[tag=${tc}]`);
                    lines.push('');
                    if (m0.option === 'custom') genCmds(lines, m0.custom, `${tc}r1`, `${tc}r1b`, abbr, isMobCreeper(m0.type));
                    if (m1.option === 'custom') genCmds(lines, m1.custom, `${tc}r2`, `${tc}r2b`, abbr, isMobCreeper(m1.type));
                }
            } else {
                const customObj = {
                    equipment: v.equipment,
                    effects: v.effects,
                    attributes: v.attributes,
                    nameConfig: v.nameConfig,
                    creeperConfig: v.creeperConfig,
                    sizeConfig: v.sizeConfig,
                    areaEffects: v.areaEffects,
                    arrowKillEffects: v.arrowKillEffects
                };
                const hasContent = hasAnyContent(v) || (onlyCreeper && v.creeperConfig) || (v.sizeConfig && v.sizeConfig.enabled) ||
                    (v.areaEffects && v.areaEffects.length) || (v.arrowKillEffects && v.arrowKillEffects.length);
                if (!hasContent) {
                    lines.push(`# ${abbr} custom ${vn} (sin config)`);
                    lines.push(`tag @e[tag=${tc},tag=!${tb}] add ${tb}`);
                    lines.push('');
                } else {
                    lines.push(`# ${abbr} custom ${vn}`);
                    genCmds(lines, customObj, tc, tb, abbr, onlyCreeper);
                }
            }
        });
        if (cleanItemsCheck.checked) {
            lines.push('# Eliminar items');
            lines.push('clear @a *[minecraft:custom_model_data=100]');
            lines.push('kill @e[type=item,nbt={Item:{components:{"minecraft:custom_model_data":100}}}]');
            lines.push('');
        }
        const lastMax = state.variants.length ? state.variants[state.variants.length - 1].max : 1;
        lines.push(`execute if score ${scoreboardName} ${scoreboardName} matches ${lastMax}.. run scoreboard players reset ${scoreboardName}`);
        return lines.join('\n');
    }

    function init() {
        initFileSystem();
        loadAllData().then(() => {
            const data = getCurrentFileData();
            if (data) {
                state.mobSelections = data.mobSelections || {};
                state.numVariants = data.numVariants || 1;
                state.variants = data.variants || [];
                state.cleanItems = data.cleanItems !== undefined ? data.cleanItems : true;
                state.activeVariantTab = Math.min(data.activeVariantTab || 0, state.variants.length - 1);
                state.variants.forEach(v => {
                    if (v.nameConfig && v.nameConfig.advancedMode === undefined) {
                        v.nameConfig.advancedMode = false;
                        v.nameConfig.advancedColors = ['#00ccff', '#ffee00'];
                        v.nameConfig.advancedStyle = 'gradient';
                    }
                });
            }
            syncUIFromState();
            variantTabContentsDiv.addEventListener('click', globalClickHandler);
            variantTabContentsDiv.addEventListener('change', globalChangeHandler);
            variantTabContentsDiv.addEventListener('input', globalInputHandler);
            numVariantsInput.addEventListener('change', function() {
                const c = Math.max(1, Math.min(30, parseInt(this.value) || 1));
                this.value = c;
                const old = [...state.variants];
                initVariants(c);
                for (let i = 0; i < Math.min(old.length, c); i++) { state.variants[i] = old[i]; if (i === 0) state.variants[i].min = 1;
                    else state.variants[i].min = state.variants[i - 1].max + 1; if (state.variants[i].max < state.variants[i].min) state.variants[i].max = state.variants[i].min; }
                if (c > 0 && state.variants[c - 1].max < state.variants[c - 1].min) state.variants[c - 1].max = state.variants[c - 1].min;
                if (state.activeVariantTab >= c) state.activeVariantTab = c - 1;
                structuralChange();
            });
            cleanItemsCheck.addEventListener('change', updateCodeOnly);
            fullRender();
            renderFileTree();
        });
    }
    init();
})();