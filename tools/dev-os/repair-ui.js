'use strict';
(() => {
 const button=document.getElementById('devos-reset-state');
 if(!button)return;
 button.addEventListener('click',()=>{
  if(!confirm('仮想OSの保存状態を初期化します。仮想OS内の設定・ファイル・ログなどが消えます。続けますか？'))return;
  if(!confirm('最終確認：実際のWindowsやPCのデータは変更しません。仮想OSの保存情報だけを削除しますか？'))return;
  try{localStorage.removeItem('pclocaltool_dev_os_v1')}catch(e){alert('保存情報を削除できませんでした: '+(e.message||e));return}
  location.reload();
 });
})();
