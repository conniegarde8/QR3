import { extension_settings } from "../../../extensions.js";

// 插件名称常量
const EXTENSION_NAME = "quick-reply-menu";

// 存储快捷回复数据
let chatQuickReplies = [];
let globalQuickReplies = [];
let menuVisible = false;
let dataNeedsUpdate = true; // 新增：数据更新标志，初始为 true

/**
 * 初始化快速回复菜单
 */
function initQuickReplyMenu() {
    // 创建快速回复按钮
    const quickReplyButton = document.createElement('div');
    quickReplyButton.id = 'quick-reply-menu-button';
    quickReplyButton.innerText = '[快速回复]';
    document.body.appendChild(quickReplyButton);

    // 创建快速回复菜单
    const quickReplyMenu = document.createElement('div');
    quickReplyMenu.id = 'quick-reply-menu';
    quickReplyMenu.innerHTML = `
        <div class="quick-reply-menu-container">
            <div class="quick-reply-list" id="chat-quick-replies">
                <div class="quick-reply-list-title">聊天快捷回复</div>
                <div id="chat-qr-items"></div>
            </div>
            <div class="quick-reply-list" id="global-quick-replies">
                <div class="quick-reply-list-title">全局快捷回复</div>
                <div id="global-qr-items"></div>
            </div>
        </div>
    `;
    document.body.appendChild(quickReplyMenu);

    // 绑定按钮点击事件
    quickReplyButton.addEventListener('click', toggleQuickReplyMenu);

    // 点击菜单外部区域关闭菜单
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('quick-reply-menu');
        const button = document.getElementById('quick-reply-menu-button');

        if (menuVisible &&
            event.target !== menu &&
            !menu.contains(event.target) &&
            event.target !== button) {
            hideQuickReplyMenu();
        }
    });
}

/**
 * 切换快速回复菜单显示/隐藏
 */
function toggleQuickReplyMenu() {
    const menu = document.getElementById('quick-reply-menu');

    if (menuVisible) {
        hideQuickReplyMenu();
    } else {
        // 优化：仅在需要时更新数据
        if (dataNeedsUpdate) {
            console.log('Fetching quick replies...');
            updateQuickReplies(); // 获取并存储数据
            dataNeedsUpdate = false; // 标记数据已加载
        } else {
            console.log('Using cached quick replies...');
        }

        // 始终根据当前数据渲染菜单
        renderQuickReplies();

        menu.style.display = 'block';
        menuVisible = true;
    }
}

/**
 * 隐藏快速回复菜单
 */
function hideQuickReplyMenu() {
    const menu = document.getElementById('quick-reply-menu');
    menu.style.display = 'none';
    menuVisible = false;
}

/**
 * 获取并更新当前可用的快捷回复（不直接渲染）
 */
function updateQuickReplies() {
    if (!window.quickReplyApi) {
        console.error('Quick Reply API not found!');
        // 清空数据以防显示旧内容
        chatQuickReplies = [];
        globalQuickReplies = [];
        return; // 提前退出
    }

    const qrApi = window.quickReplyApi;

    // 清空现有数据
    chatQuickReplies = [];
    globalQuickReplies = [];

    // 用于跟踪已添加的标签，避免重复
    const chatQrLabels = new Set();

    try {
        // 获取聊天快捷回复
        if (qrApi.settings?.chatConfig?.setList) { // 使用可选链增加健壮性
            qrApi.settings.chatConfig.setList.forEach(setLink => {
                if (setLink.isVisible && setLink.set?.qrList) { // 使用可选链
                    setLink.set.qrList.forEach(qr => {
                        if (!qr.isHidden) {
                            chatQuickReplies.push({
                                setName: setLink.set.name,
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                            chatQrLabels.add(qr.label);
                        }
                    });
                }
            });
        }

        // 获取全局快捷回复
        if (qrApi.settings?.config?.setList) { // 使用可选链
            qrApi.settings.config.setList.forEach(setLink => {
                if (setLink.isVisible && setLink.set?.qrList) { // 使用可选链
                    setLink.set.qrList.forEach(qr => {
                        if (!qr.isHidden && !chatQrLabels.has(qr.label)) {
                            globalQuickReplies.push({
                                setName: setLink.set.name,
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                        }
                    });
                }
            });
        }

        console.log('Updated Quick Replies - Chat:', chatQuickReplies.length, 'Global:', globalQuickReplies.length);

    } catch (error) {
        console.error('Error fetching quick replies:', error);
        // 出错时也清空数据
        chatQuickReplies = [];
        globalQuickReplies = [];
    }
    // 注意：此函数不再调用 renderQuickReplies()
}

/**
 * 渲染快捷回复到菜单 (使用 DocumentFragment 优化)
 */
function renderQuickReplies() {
    const chatContainer = document.getElementById('chat-qr-items');
    const globalContainer = document.getElementById('global-qr-items');

    // 清空现有内容
    chatContainer.innerHTML = '';
    globalContainer.innerHTML = '';

    // 创建 DocumentFragment
    const chatFragment = document.createDocumentFragment();
    const globalFragment = document.createDocumentFragment();

    // 渲染聊天快捷回复
    if (chatQuickReplies.length > 0) {
        chatQuickReplies.forEach(qr => {
            const item = createQuickReplyItem(qr);
            chatFragment.appendChild(item); // 添加到 Fragment
        });
        chatContainer.appendChild(chatFragment); // 一次性添加到 DOM
    } else {
        chatContainer.innerHTML = '<div class="quick-reply-empty">没有可用的聊天快捷回复</div>';
    }

    // 渲染全局快捷回复
    if (globalQuickReplies.length > 0) {
        globalQuickReplies.forEach(qr => {
            const item = createQuickReplyItem(qr);
            globalFragment.appendChild(item); // 添加到 Fragment
        });
        globalContainer.appendChild(globalFragment); // 一次性添加到 DOM
    } else {
        globalContainer.innerHTML = '<div class="quick-reply-empty">没有可用的全局快捷回复</div>';
    }
}

/**
 * 辅助函数：创建单个快捷回复项的 DOM 元素
 * @param {object} qr - 快捷回复对象 {setName, label, message}
 * @returns {HTMLElement} - 创建的 div 元素
 */
function createQuickReplyItem(qr) {
    const item = document.createElement('div');
    item.className = 'quick-reply-item';
    item.innerText = qr.label;
    item.title = qr.message.substring(0, 50) + (qr.message.length > 50 ? '...' : '');
    item.addEventListener('click', () => {
        triggerQuickReply(qr.setName, qr.label);
    });
    return item;
}


/**
 * 触发指定的快捷回复
 * @param {string} setName Quick Reply Set 名称
 * @param {string} label Quick Reply 标签
 */
function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error('Quick Reply API not found!');
        // 可以在这里添加用户可见的错误提示
        hideQuickReplyMenu(); // 仍然关闭菜单
        return;
    }

    try {
        window.quickReplyApi.executeQuickReply(setName, label)
            .then(result => {
                console.log(`Quick Reply "${setName}.${label}" 执行成功:`, result);
                hideQuickReplyMenu(); // 成功后关闭菜单
            })
            .catch(error => {
                console.error(`触发 Quick Reply "${setName}.${label}" 失败:`, error);
                // 可以在这里添加用户可见的错误提示
                hideQuickReplyMenu(); // 失败后也关闭菜单
            });
    } catch (error) {
        console.error('Error triggering quick reply:', error);
        // 可以在这里添加用户可见的错误提示
        hideQuickReplyMenu(); // 出错时关闭菜单
    }
}

/**
 * 插件加载入口
 */
jQuery(async () => {
    // 初始化插件设置
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};

    // 添加设置项到扩展设置页面
    const settingsHtml = `
    <div id="${EXTENSION_NAME}-settings" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>快速回复增强菜单</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <p>此插件隐藏了原有的快捷回复栏，并创建了一个新的快速回复菜单。</p>
                <p>点击屏幕中央顶部的"[快速回复]"按钮可以打开菜单。</p>
                <p><b>注意:</b> 菜单内容仅在首次打开时加载，如需更新请刷新页面。</p> <!-- 添加缓存说明 -->
                <div class="flex-container flexGap5">
                    <label>插件状态:</label>
                    <select id="${EXTENSION_NAME}-enabled" class="text_pole">
                        <option value="true" selected>启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>
                <hr class="sysHR">
            </div>
        </div>
    </div>`;

    $('#extensions_settings').append(settingsHtml);

    // 初始化UI组件
    initQuickReplyMenu();

    // 监听设置变更
    $(`#${EXTENSION_NAME}-enabled`).on('change', function() {
        const isEnabled = $(this).val() === 'true';
        extension_settings[EXTENSION_NAME].enabled = isEnabled;
        const button = $('#quick-reply-menu-button'); // 使用 jQuery 获取按钮

        if (isEnabled) {
            button.show();
            // 启用时，重置数据更新标志，以便下次打开时重新加载
            dataNeedsUpdate = true;
        } else {
            button.hide();
            hideQuickReplyMenu(); // 禁用时隐藏菜单
        }
    });

    // 检查插件是否已启用
    const button = $('#quick-reply-menu-button'); // 使用 jQuery 获取按钮
    if (extension_settings[EXTENSION_NAME].enabled !== false) {
        extension_settings[EXTENSION_NAME].enabled = true;
        $(`#${EXTENSION_NAME}-enabled`).val('true');
        button.show();
    } else {
        $(`#${EXTENSION_NAME}-enabled`).val('false');
        button.hide();
    }
});