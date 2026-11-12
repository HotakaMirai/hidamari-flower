/* ============================================================
   main.js — ひだまりフラワー — ページ内の動きと料金計算
   ------------------------------------------------------------
   このファイルでしていること
     1. 画面に入った要素を、ふわっと表示する（失敗しても内容が見えるよう、最初に置く）
     2. スクロールに合わせて、進み具合の線・今見ているメニュー・「上へ戻る」ボタンを切り替える
     3. 狭い画面のメニューを開閉する
     4. アレンジメントの料金を計算し、注文の内容をお問い合わせのフォームに書き写す
     5. 写真を拡大表示する
     6. お問い合わせフォームの入力を確かめ、受け取り方に合わせてお届け先の欄を使えるようにする
     7. 郵便番号から住所を調べて入れる
     8. フッターに今年の年を表示する

   見た目は CSS に任せ、JavaScript はクラス（is-open など）や変数（--progress）を付け替えるだけにしている。
   ============================================================ */

// "use strict" を先頭に書くと、まちがえやすい書き方がエラーになる（厳格モード）。
"use strict";

// head の defer により、HTML の解析が終わってからこのファイルが実行される。
// そのため、ここではもう HTML の要素を探せる。
// <html class="no-js"> の no-js を外し、「JavaScript が動いている」ことを CSS に伝える。
document.documentElement.classList.remove("no-js");

// ------------------------------------------------------------
// 1. 画面に入った要素から順に表示する。動きを減らす設定や非対応ブラウザでは、すぐ表示する。
// ------------------------------------------------------------
// この節は、no-js を外した直後に置く。
// no-js を外すと、CSS は data-reveal の要素をいったん透明にする。
// 後ろの節でエラーが起きて JavaScript が止まっても、ここまで済んでいれば、内容は必ず表示される。

// OS で「動きを減らす」設定をしているかどうか（true / false）
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// data-reveal 属性を付けた要素が対象。表示の動きそのものは utilities.css に書いている。
const revealTargets = [...document.querySelectorAll("[data-reveal]")];

if (reduceMotion || !("IntersectionObserver" in window)) {
  // 動かさない場合は、最初からすべて表示する
  revealTargets.forEach((target) => target.classList.add("is-revealed"));
} else {
  // IntersectionObserver は、要素が画面に入ったかどうかを検出する仕組み。
  // 画面に入ったら .is-revealed を付け、その要素の監視をやめる（unobserve）。
  //   rootMargin … 画面の下 12% を除いた範囲に入ったら反応する（少し入ってから表示する）
  //   threshold  … 要素の 12% が見えたら反応する
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;   // まだ画面に入っていない
      }
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
  revealTargets.forEach((target) => observer.observe(target));
}

// ------------------------------------------------------------
// 2. スクロール位置に合わせて、進み具合の線・今見ているメニュー・「上へ戻る」ボタンを切り替える。
// ------------------------------------------------------------

// 使う要素を、最初に探しておく。# は id で探すという意味
const header = document.querySelector("#header");
const scrollProgress = document.querySelector("#scrollProgress");
const toTop = document.querySelector("#toTop");

// メニューのリンクをすべて集め、[...] で配列に変える（配列にすると map や filter が使える）
const navLinks = [...document.querySelectorAll(".gnav ul a")];

// 各リンクの href（#about など）から、行き先のセクションを探して並べる。
// 見つからなかったもの（null）は、filter(Boolean) で取り除く。
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

// スクロールごとの処理を次の描画タイミングにまとめ、画面更新を増やしすぎない。
// scroll イベントは 1 秒に何十回も起きる。そのたびに計算すると重くなるので、
// 「すでに予約済みなら何もしない」という目印（scrollTicking）を使う。
let scrollTicking = false;   // あとで書き換えるので const ではなく let

function updateScrollState() {
  try {
    const scrollPosition = window.scrollY;   // ページの一番上から、何 px スクロールしたか

    // 進み具合を 0〜1 に直してから、% にして CSS に渡す。見た目は CSS に任せる。
    // スクロールできる長さ ＝ ページ全体の高さ − 画面の高さ
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    // 「条件 ? A : B」は、条件が正しければ A、そうでなければ B になる書き方
    const progress = scrollableHeight > 0 ? Math.min(scrollPosition / scrollableHeight, 1) : 0;
    scrollProgress.style.setProperty("--progress", (progress * 100).toFixed(1) + "%");

    // 画面の高さの 7 割より下までスクロールしたら、「上へ戻る」ボタンを出す。
    // classList.toggle(名前, 条件) は、条件が true ならクラスを付け、false なら外す。
    toTop.classList.toggle("is-visible", scrollPosition > window.innerHeight * 0.7);

    // 今見ているセクションを調べる。
    // ヘッダーのすぐ下（＋24px）の線より上に始まったセクションのうち、最後のものが「今見ている」セクション。
    const currentLine = scrollPosition + header.offsetHeight + 24;
    const currentSection = navSections.filter((section) => section.offsetTop <= currentLine).at(-1);

    // 今見ているセクションへのリンクに .is-current を付け、読み上げソフト向けに aria-current も付ける
    navLinks.forEach((link) => {
      const isCurrent = currentSection !== undefined && link.getAttribute("href") === "#" + currentSection.id;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  } finally {
    // finally の中は、try の中でエラーが起きても必ず実行される
    scrollTicking = false;   // 途中で失敗しても、次のスクロールで再び動けるようにする
  }
}

// スクロールされたら、次に画面を描き直す直前（requestAnimationFrame）に 1 回だけ updateScrollState を呼ぶ
function scheduleScrollUpdate() {
  if (scrollTicking) {
    return;   // すでに予約済みなので、何もしない
  }
  scrollTicking = true;
  window.requestAnimationFrame(updateScrollState);
}

// { passive: true } は「スクロールを止める処理はしない」とブラウザに伝え、スクロールを軽くする
window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
updateScrollState();   // ページを開いた時点の状態も、一度反映しておく

// 「上へ戻る」ボタンを押したら、ページの一番上へ移動する。動きを減らす設定なら、すぐに移動する
toTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});

// ------------------------------------------------------------
// 3. 狭い画面のメニュー。開いているかどうかをボタンの aria-expanded にも伝える。
// ------------------------------------------------------------
const navToggle = document.querySelector("#navToggle");
const nav = document.querySelector("#gnav");

// メニューを開く（isOpen が true）か、閉じる（false）。
// 見た目の切り替えは CSS（.is-open と aria-expanded="true"）に任せる。
function setMenuOpen(isOpen) {
  navToggle.setAttribute("aria-expanded", String(isOpen));   // 属性の値は文字列なので String() で "true" / "false" にする
  nav.classList.toggle("is-open", isOpen);
}

// メニューボタンを押したら、今の状態と逆にする（開いていれば閉じ、閉じていれば開く）
navToggle.addEventListener("click", () => {
  setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
});

// メニューの中のリンクを押したら、移動と同時にメニューを閉じる。
// closest("a") は、押された場所から外側へたどって、最初に見つかった <a> を返す（なければ null）。
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setMenuOpen(false);
  }
});

// Esc キーでも閉じる
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
  }
});

// メニューの外側を押しても閉じる
document.addEventListener("click", (event) => {
  if (!event.target.closest("#gnav, #navToggle")) {
    setMenuOpen(false);
  }
});

// ------------------------------------------------------------
// 4. 料金の単価を足してから点数を掛ける。入力が変わるたびに計算し直す。
// ------------------------------------------------------------
// 合計 ＝ 点数 ×（サイズの価格 ＋ 選んだオプションの価格の合計）
const simulator = document.querySelector(".sim");
if (simulator) {
  const quantityInput = simulator.querySelector("#simQuantity");     // 点数のスライダー
  const quantityOutput = simulator.querySelector("#simQuantityOut"); // 「1 点」の表示
  const amountOutput = simulator.querySelector("#simAmount");        // 合計金額の表示
  const sizeInputs = [...simulator.querySelectorAll('input[name="size"]')];     // S・M・L のラジオボタン
  const optionInputs = [...simulator.querySelectorAll('input[name="option"]')]; // オプションのチェックボックス
  const yen = new Intl.NumberFormat("ja-JP");   // 5300 を「5,300」のように 3 桁ごとに区切る書式

  function updateEstimate() {
    // 入力欄の値は文字列なので、Number() で数に直してから計算する
    const quantity = Number(quantityInput.value);
    const selectedSize = sizeInputs.find((input) => input.checked);   // 選ばれているラジオボタン
    const basePrice = Number(selectedSize.value);

    // チェックされたオプションだけを取り出し（filter）、価格を足し合わせる（reduce）。0 は足し始めの値
    const optionPrice = optionInputs
      .filter((input) => input.checked)
      .reduce((sum, input) => sum + Number(input.value), 0);
    const total = quantity * (basePrice + optionPrice);

    quantityOutput.textContent = quantity + " 点";
    amountOutput.textContent = yen.format(total) + " 円";
  }

  // スライダーは動かしている最中（input）、ラジオとチェックは選んだとき（change）に計算し直す
  quantityInput.addEventListener("input", updateEstimate);
  [...sizeInputs, ...optionInputs].forEach((input) => {
    input.addEventListener("change", updateEstimate);
  });
  updateEstimate();   // 最初の表示

  // 「この内容で注文する」を押したら、選んだ内容をお問い合わせのフォームに書き写す。
  // 注文を受けるしくみを新しく作らず、お問い合わせの送信で注文を受け付ける。
  // ボタンは #inquiry へのリンクなので、JavaScript が動かないときも、フォームまでは移れる
  const orderLink = simulator.querySelector("[data-order]");
  const topicInput = document.querySelector("#contactTopic");
  const messageInput = document.querySelector("#contactMessage");
  if (orderLink && topicInput && messageInput) {
    orderLink.addEventListener("click", (event) => {
      const size = sizeInputs.find((input) => input.checked);
      const options = optionInputs
        .filter((input) => input.checked)
        .map((input) => input.dataset.name);   // data-name の「ラッピング」などを集める

      topicInput.value = "ご注文";
      // 配列の各行を、改行（\n）でつないで一つの文にする
      messageInput.value = [
        "【ご注文】",
        `サイズ：${size.dataset.name}`,
        `点数：${quantityInput.value} 点`,
        `オプション：${options.length > 0 ? options.join("・") : "なし"}`,
        `合計金額（目安）：${amountOutput.textContent}`,
        "",
        "お受け取りの希望日：",
      ].join("\n");

      // 値を書き換えただけでは input イベントが起きないので、自分で起こして、
      // 6 の節の文字数の表示と、送信ボタンを押せるかどうかを更新させる
      topicInput.dispatchEvent(new Event("input"));
      messageInput.dispatchEvent(new Event("input"));
      // リンクの移動を止めて、自分でフォームまで動かし、お名前の欄にフォーカスを置く。
      // リンクのままだと、移動したときにフォーカスが外れ、次に入力する欄が分かりにくい
      event.preventDefault();
      document.querySelector("#inquiry").scrollIntoView();
      document.querySelector("#contactName")?.focus({ preventScroll: true });
    });
  }
}

// ------------------------------------------------------------
// 5. 写真の拡大表示。前後の写真に切り替えられ、閉じると元のリンクにフォーカスが戻る。
// ------------------------------------------------------------
// HTML の <dialog id="flowerLightbox"> を使う。
// 写真のリンクは画像ファイルそのものを指しているので、JavaScript が動かなくても画像は開ける。
const galleryLinks = [...document.querySelectorAll("[data-lightbox-open]")];
const lightbox = document.querySelector("#flowerLightbox");

// iPhone のようにマウスを使わない端末では、写真がもともと画面いっぱいに見えるので拡大表示は使わない。
// (hover: none) は「マウスを乗せる操作ができない端末」を表す。リンクを外して、写真だけを残す。
const isTouchOnly = window.matchMedia("(hover: none)").matches;
if (isTouchOnly) {
  // replaceWith で、<a> を中の <img> と入れ替える
  galleryLinks.forEach((link) => link.replaceWith(link.querySelector("img")));
} else if (galleryLinks.length && lightbox) {
  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxCaption = lightbox.querySelector(".lightbox-caption");
  let currentIndex = 0;   // 今表示している写真の番号（0 から数える）
  let opener = null;      // 拡大表示を開いたリンク。閉じたとき、ここにフォーカスを戻す

  // index 番目の写真を、拡大表示に映す
  function showGalleryImage(index) {
    // 最後の次は最初へ、最初の前は最後へ戻る。
    // たとえば写真が 3 枚のとき、-1 は 2 に、3 は 0 になる（% は割り算の余り）
    currentIndex = (index + galleryLinks.length) % galleryLinks.length;
    const link = galleryLinks[currentIndex];
    const caption = link.closest("figure").querySelector("figcaption").textContent;

    lightboxImage.src = link.href;
    lightboxImage.alt = link.querySelector("img").alt;
    // `…${式}…` はテンプレート文字列。${ } の中の値が、文字列に埋め込まれる
    lightboxCaption.textContent = `${caption}（${currentIndex + 1} / ${galleryLinks.length}）`;
  }

  // 写真を押したら、ページを移動せずに拡大表示を開く
  galleryLinks.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      // 新しいタブで開く操作（Ctrl キーを押しながらのクリックなど）は、通常のリンクとして扱う。
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();   // リンク本来の動き（画像ファイルへの移動）を止める
      opener = link;
      showGalleryImage(index);
      lightbox.showModal();     // dialog をページの手前に開く
    });
  });

  // 前へ・次へ・閉じる の各ボタン
  lightbox.querySelector("[data-lightbox-prev]").addEventListener("click", () => {
    showGalleryImage(currentIndex - 1);
  });
  lightbox.querySelector("[data-lightbox-next]").addEventListener("click", () => {
    showGalleryImage(currentIndex + 1);
  });
  lightbox.querySelector("[data-lightbox-close]").addEventListener("click", () => {
    lightbox.close();
  });

  // キーボードの ← → でも切り替えられる
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      showGalleryImage(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      showGalleryImage(currentIndex + 1);
    }
  });

  // 写真の外側（暗い幕）をクリックしても閉じる。Esc キーで閉じるのは dialog の標準の動き。
  // 暗い幕を押すと、event.target は dialog そのものになる（中の写真やボタンを押したときは、それらになる）。
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      lightbox.close();
    }
  });

  // 閉じたら、開いたときのリンクにフォーカスを戻す。キーボードで操作する人が、元の場所から続けられる。
  // ?. は、opener が null のときは何もしない書き方
  lightbox.addEventListener("close", () => {
    opener?.focus();
  });
}

// ------------------------------------------------------------
// 6. 空白だけの必須入力を送らないようにする。送信そのものはブラウザに任せる。
// ------------------------------------------------------------
// JavaScript が無効な場合も、HTML の required などによる確認と送信は使える。
const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  const requiredFields = [...contactForm.querySelectorAll("[required]")];   // required 属性の付いた欄
  const messageInput = contactForm.querySelector("#contactMessage");
  const messageCount = contactForm.querySelector("[data-message-count]");
  const submitButton = contactForm.querySelector('[type="submit"]');

  // お問い合わせ内容の文字数を「12 / 1,000文字」のように表示する
  function updateMessageCount() {
    messageCount.textContent = `${messageInput.value.length.toLocaleString("ja-JP")} / ${Number(messageInput.maxLength).toLocaleString("ja-JP")}文字`;
  }

  function updateSubmitState() {
    // 必須欄が空白だけの場合と、形式・文字数の条件を満たさない場合は送信できない。
    // every は「すべての欄が条件を満たすか」を調べる。trim() は前後の空白を取り除く。
    // validity.valid は、HTML の条件（type="email"、minlength など）を満たしているかどうか。
    // disabled の欄（表示していないお届け先）は、送信されないので確かめない
    submitButton.disabled = !requiredFields.every((field) => field.disabled || (field.value.trim() && field.validity.valid));
  }

  // 受け取り方は「ご注文」のときだけ、お届け先は「お届けする」のときだけ使えるようにする。
  // 表示の切り替えは CSS の :has() が受け持つので、ここでは disabled だけを切り替える
  const topicSelect = contactForm.querySelector("#contactTopic");
  const receiveInputs = [...contactForm.querySelectorAll('input[name="受け取り方"]')];
  const deliveryInput = contactForm.querySelector("[data-delivery]");
  const deliveryFields = [...contactForm.querySelectorAll(".delivery-field input")];

  function updateDelivery() {
    const ordering = topicSelect.value === "ご注文";
    const delivering = ordering && deliveryInput.checked;
    receiveInputs.forEach((input) => {
      input.disabled = !ordering;
    });
    deliveryFields.forEach((field) => {
      field.disabled = !delivering;
    });
    updateSubmitState();
  }

  messageInput.addEventListener("input", updateMessageCount);
  updateMessageCount();

  // 入力のたびに、送信ボタンを押せるかどうかを見直す
  requiredFields.forEach((field) => {
    field.addEventListener("input", () => {
      field.setCustomValidity("");   // 送信時に付けたエラーの文を、入力し直したら消す
      updateSubmitState();
    });
    field.addEventListener("change", updateSubmitState);
  });
  // 種類か受け取り方を選び直すたびに、お届け先の欄を使えるかどうかを見直す
  topicSelect.addEventListener("input", updateDelivery);
  receiveInputs.forEach((input) => {
    input.addEventListener("change", updateDelivery);
  });
  updateDelivery();   // 最初の状態（updateSubmitState もここで呼ばれる）

  // ブラウザの「戻る」で戻ってきたとき、入力が残っていることがあるので、もう一度見直す
  window.addEventListener("pageshow", updateDelivery);

  // 送信する直前に、空白だけの欄がないかを確かめる。
  // あれば setCustomValidity でエラーの文を付け、reportValidity でブラウザ標準の吹き出しを出し、送信を止める。
  contactForm.addEventListener("submit", (event) => {
    requiredFields.filter((field) => !field.disabled).forEach((field) => {
      field.setCustomValidity(field.value.trim() ? "" : "この項目を入力してください。");
    });
    if (!contactForm.reportValidity()) {
      event.preventDefault();   // 送信を止める
    }
  });
}

// ------------------------------------------------------------
// 7. 郵便番号を 7 桁入れたら、住所を調べて入れる。
// ------------------------------------------------------------
// 住所は、郵便番号を検索できる外部のサービス（zipcloud）に問い合わせて調べる。
// 見つからないときや、通信できないときは、自分で入力してもらう。
const postalInput = document.querySelector("#contactPostal");
const addressInput = document.querySelector("#contactAddress");
const postalStatus = document.querySelector("[data-postal-status]");
if (postalInput && addressInput && postalStatus) {
  let lastSearched = "";   // 同じ番号で何度も問い合わせないよう、最後に調べた番号を覚えておく

  // 住所を調べて、住所の欄が空なら入れる。async を付けた関数の中では、await で結果を待てる
  async function fillAddress(zipcode) {
    postalStatus.textContent = "住所を調べています…";
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
      if (!response.ok) {
        throw new Error(`サーバーからの応答が ${response.status} でした`);
      }
      const data = await response.json();
      const place = data.results?.[0];   // 見つからなければ results は null なので、place は undefined になる
      if (!place) {
        postalStatus.textContent = "住所が見つかりませんでした。郵便番号を確かめるか、住所を入力してください。";
        return;
      }
      const address = place.address1 + place.address2 + place.address3;   // 都道府県・市区町村・町域
      // 自分で書いた住所は消さない。空のときだけ入れる
      if (addressInput.value.trim() === "") {
        addressInput.value = address;
        addressInput.dispatchEvent(new Event("input"));   // 送信ボタンを押せるかどうかを見直させる
      }
      postalStatus.textContent = `${address} を入れました。続きの番地などを入力してください。`;
    } catch (error) {
      console.warn("住所を調べられませんでした", error);
      postalStatus.textContent = "住所を調べられませんでした。住所を入力してください。";
    }
  }

  postalInput.addEventListener("input", () => {
    // 「100-0001」のように - を入れても調べられるよう、- を取り除いてから数える
    const zipcode = postalInput.value.replaceAll("-", "").trim();
    const isSevenDigits = zipcode.length === 7 && !Number.isNaN(Number(zipcode));
    if (isSevenDigits && zipcode !== lastSearched) {
      lastSearched = zipcode;
      fillAddress(zipcode);
    }
  });
}

// ------------------------------------------------------------
// 8. フッターに今年の年を表示する。
// ------------------------------------------------------------
// 年が変わっても、HTML を書き直さずに済む
const copyright = document.querySelector(".site-footer-copy small");
copyright.textContent = "© " + new Date().getFullYear() + " Hidamari Flower. All rights reserved.";
