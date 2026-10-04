
function doLogout(e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(!confirm('Sair do sistema?\nSua sessão será encerrada neste dispositivo.')) return;
  localStorage.removeItem('unidacUser');
  // Volta sempre para a página principal (index.html na raiz)
  var path = window.location.pathname.split('/').filter(Boolean);
  // Remove: arquivo.html, pages, nome-do-cargo
  if(path.length && path[path.length-1].indexOf('.html') !== -1) path.pop();
  if(path.length && path[path.length-1] === 'pages') path.pop();
  if(path.length) path.pop(); // cargo
  var basePath = path.length ? '/' + path.join('/') + '/' : '/';
  window.location.href = basePath + 'index.html';
}

function showToast(msg){let t=document.querySelector('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}