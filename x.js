/*
 * Lampa Plugin
 * Name: Zapir
 * Author: Запир
 * Description: Выбор максимального качества, предоставленного источником
 */

(function () {
  'use strict';

  /*
   * ShowyPRO Quality Patch
   * Не обходит PRO/подписку.
   * Выбирает максимальное качество из тех вариантов,
   * которые сам источник уже передал плагину.
   */

  var SHOWY = 'http://showypro.com/m.js';
  var loaded = false;

  function qualityNumber(key) {
    var s = String(key || '').toLowerCase().replace(',', '.');
    var m = s.match(/(\d+(?:\.\d+)?)/);
    if (!m) return -1;

    var n = parseFloat(m[1]);

    // 4K / 2K / 8K style labels
    if (s.indexOf('k') !== -1 && n < 20) {
      return Math.round(n * 1000);
    }

    return Math.round(n);
  }

  function chooseBestQuality(element) {
    if (!element || !element.quality || typeof element.quality !== 'object') {
      return;
    }

    var keys = Object.keys(element.quality).filter(function (key) {
      return element.quality[key] &&
             typeof element.quality[key] === 'string';
    });

    if (!keys.length) return;

    keys.sort(function (a, b) {
      return qualityNumber(b) - qualityNumber(a);
    });

    var best = keys[0];

    if (qualityNumber(best) < 0) return;

    var url = element.quality[best];

    if (!url) return;

    if (url.indexOf(' or ') !== -1) {
      var parts = url.split(' or ');
      element.url = parts[0];
      element.url_reserve = parts[1];
    } else {
      element.url = url;
      delete element.url_reserve;
    }

    // Для отладки можно посмотреть выбранное качество
    element.quality_selected = best;
  }

  function installPlayerPatch() {
    if (
      installPlayerPatch.done ||
      !window.Lampa ||
      !Lampa.Player ||
      typeof Lampa.Player.play !== 'function'
    ) {
      return;
    }

    installPlayerPatch.done = true;

    var originalPlay = Lampa.Player.play;

    Lampa.Player.play = function (element) {
      try {
        chooseBestQuality(element);
      } catch (e) {}

      return originalPlay.apply(this, arguments);
    };
  }

  function loadOriginal() {
    if (loaded) return;
    loaded = true;

    var script = document.createElement('script');

    script.src =
      SHOWY +
      (SHOWY.indexOf('?') >= 0 ? '&' : '?') +
      'quality_patch=' +
      Date.now();

    script.onload = function () {
      installPlayerPatch();

      // На случай асинхронной регистрации компонентов Lampa
      setTimeout(installPlayerPatch, 500);
      setTimeout(installPlayerPatch, 2000);
      setTimeout(installPlayerPatch, 5000);
    };

    script.onerror = function () {
      if (window.Lampa && Lampa.Noty) {
        Lampa.Noty.show(
          'ShowyPRO: не удалось загрузить исходный m.js'
        );
      }
    };

    (document.head || document.documentElement).appendChild(script);
  }

  loadOriginal();
})();
