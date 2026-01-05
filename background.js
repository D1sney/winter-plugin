// Service Worker для Winter Magic

// Обработка горячих клавиш
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-menu") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleMenu" });
      }
    });
  }
});

// Синхронизация настроек между вкладками
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "settingsChanged" && message.settings) {
    // Отправляем обновлённые настройки во все вкладки, кроме отправителя
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id && tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: "settingsUpdated",
            settings: message.settings
          }).catch(() => {
            // Игнорируем ошибки для вкладок без content script
          });
        }
      });
    });
  }
});
