import {markets} from './data.js';
import {loadLiveTrades} from './live-trades.js';


/* =========================================================
   CORE
   ========================================================= */

const $=s=>document.querySelector(s);

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[m]));


/*
 * IMPORTANT
 *
 * Your website is hosted on Pages while the API is
 * hosted on a Cloudflare Worker.
 *
 * Therefore API requests MUST use the Worker URL.
 */
const API_BASE=
  'https://aurevia-api.isaac-rodriuez3035.workers.dev';


const AUTH_KEY='aurevia_session_v4';
const BOOT_KEY='aurevia_boot_seen_v4';
const LOCAL_USERS_KEY='aurevia_local_accounts_v1';
const LOCAL_DATA_KEY='aurevia_local_data_v1';
const SECTION_READY_KEY='aurevia_section_transition_ready_v1';
const SECTION_BUSY_KEY='aurevia_section_transition_busy_v1';


/* =========================================================
   AUTH STORAGE
   ========================================================= */

const authSession=()=>{
  try{
    return JSON.parse(
      localStorage.getItem(AUTH_KEY)||'null'
    );
  }catch{
    return null;
  }
};


const saveSession=s=>
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify(s)
  );


const clearSession=()=>
  localStorage.removeItem(AUTH_KEY);


/* =========================================================
   LOCAL DATA HELPERS
   ========================================================= */

const readJSON=(k,d)=>{
  try{
    return JSON.parse(
      localStorage.getItem(k)||
      JSON.stringify(d)
    );
  }catch{
    return d;
  }
};


const writeJSON=(k,v)=>
  localStorage.setItem(
    k,
    JSON.stringify(v)
  );


async function localHash(password,salt){

  const enc=new TextEncoder();

  const data=enc.encode(
    String(salt||'')+
    '::'+
    String(password||'')
  );

  if(
    crypto?.subtle?.digest
  ){

    const bits=
      await crypto.subtle.digest(
        'SHA-256',
        data
      );

    return [
      ...new Uint8Array(bits)
    ]
      .map(
        x=>x.toString(16).padStart(2,'0')
      )
      .join('');
  }

  let h=0;

  for(const b of data){
    h=((h<<5)-h+b)|0;
  }

  return String(h>>>0);
}


async function localLegacyHash(
  password,
  salt
){

  const enc=new TextEncoder();

  const raw=
    await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

  const bits=
    await crypto.subtle.deriveBits(
      {
        name:'PBKDF2',
        salt:hexToBytes(salt),
        iterations:100000,
        hash:'SHA-256'
      },
      raw,
      256
    );

  return [
    ...new Uint8Array(bits)
  ]
    .map(
      x=>x.toString(16).padStart(2,'0')
    )
    .join('');
}


const hexToBytes=h=>{

  const a=
    new Uint8Array(
      h.length/2
    );

  for(
    let i=0;
    i<a.length;
    i++
  ){

    a[i]=parseInt(
      h.slice(i*2,i*2+2),
      16
    );
  }

  return a;
};


const localToken=()=>{

  const a=
    new Uint8Array(16);

  crypto.getRandomValues(a);

  return [
    ...a
  ]
    .map(
      x=>x.toString(16).padStart(2,'0')
    )
    .join('');
};


function localUsers(){
  return readJSON(
    LOCAL_USERS_KEY,
    []
  );
}


function localData(){
  return readJSON(
    LOCAL_DATA_KEY,
    {}
  );
}


function localCurrent(){

  const s=
    authSession();

  if(!s?.id){
    return null;
  }

  return localData()[s.id]||null;
}


/* =========================================================
   LOCAL FALLBACK
   ========================================================= */

async function localRequest(
  path,
  options={}
){

  const method=
    (options.method||'GET')
      .toUpperCase();

  let body={};

  try{

    body=
      options.body
        ?JSON.parse(options.body)
        :{};

  }catch{

    body={};
  }


  /* REGISTER */

  if(
    path==='/api/auth/register'&&
    method==='POST'
  ){

    const name=
      String(body.name||'').trim();

    const email=
      String(body.email||'')
        .trim()
        .toLowerCase();

    const password=
      String(body.password||'');

    const phone=
      String(body.phone||'').trim();

    const country=
      String(body.country||'').trim();


    if(
      name.length<2||
      !email.includes('@')||
      password.length<8||
      phone.length<7||
      country.length<2
    ){

      throw Object.assign(
        Error(
          'Enter your full name, valid email, phone, country and a password of at least 8 characters.'
        ),
        {status:400}
      );
    }


    const users=
      localUsers();


    if(
      users.some(
        u=>u.email===email
      )
    ){

      throw Object.assign(
        Error(
          'An account with that email already exists on this device.'
        ),
        {status:409}
      );
    }


    const salt=
      localToken();

    const hash=
      await localHash(
        password,
        salt
      );

    const id=
      'local_'+localToken();


    const user={
      id,
      name,
      email,
      phone,
      country,
      role:'user',
      plan:'Basic',
      status:'active',
      local:true
    };


    users.push({
      id,
      name,
      email,
      phone,
      country,
      role:'user',
      plan:'Basic',
      status:'active',
      salt,
      hash
    });


    writeJSON(
      LOCAL_USERS_KEY,
      users
    );


    const profile={
      first_name:
        name.split(' ')[0]||name,

      middle_name:'',

      last_name:
        name
          .split(' ')
          .slice(1)
          .join(''),

      phone,
      country,
      date_of_birth:'',
      occupation:'',
      nationality:country,
      gender:'',
      state:'',
      city:'',
      address_line1:'',
      address_line2:'',
      postal_code:'',
      timezone:'Africa/Lagos',
      tax_residency:'',
      employer_name:'',
      source_of_funds:'',
      identity_status:'pending',
      address_status:'pending',
      two_factor_enabled:false
    };


    const data=
      localData();


    data[id]={
      user,
      profile,

      wallet:{
        balance_kobo:0,
        locked_kobo:0,
        currency:'NGN'
      },

      transactions:[],
      beneficiaries:[],
      withdrawals:[],

      notifications:[
        {
          id:localToken(),
          title:'Welcome to Aurevia',
          body:
            'Your account has been created. Complete your personal profile before using account operations.',
          kind:'system',
          created_at:
            new Date().toISOString()
        }
      ]
    };


    writeJSON(
      LOCAL_DATA_KEY,
      data
    );


    saveSession(user);


    return {
      user,
      local:true
    };
  }


  /* LOGIN */

  if(
    path==='/api/auth/login'&&
    method==='POST'
  ){

    const email=
      String(body.email||'')
        .trim()
        .toLowerCase();

    const password=
      String(body.password||'');


    const u=
      localUsers().find(
        x=>x.email===email
      );


    if(!u){

      throw Object.assign(
        Error(
          'Account not found. If the server is not connected, create the account on this device first.'
        ),
        {status:401}
      );
    }


    let hash=
      await localHash(
        password,
        u.salt
      );


    if(hash!==u.hash){

      try{

        hash=
          await localLegacyHash(
            password,
            u.salt
          );

      }catch{}


      if(hash!==u.hash){

        throw Object.assign(
          Error(
            'Incorrect email or password.'
          ),
          {status:401}
        );
      }
    }


    const user={
      id:u.id,
      name:u.name,
      email:u.email,
      phone:u.phone,
      country:u.country,
      role:u.role,
      plan:u.plan,
      status:u.status,
      local:true
    };


    const d=
      localData();


    if(d[u.id]){
      d[u.id].user=user;
    }


    writeJSON(
      LOCAL_DATA_KEY,
      d
    );


    saveSession(user);


    return {
      user,
      local:true
    };
  }


  /* LOCAL LOGOUT */

  if(
    path==='/api/auth/logout'&&
    method==='POST'
  ){

    return {
      ok:true,
      local:true
    };
  }


  /* PROTECTED LOCAL ACCOUNT */

  const cur=
    localCurrent();


  if(!cur){

    throw Object.assign(
      Error(
        'Please log in to continue.'
      ),
      {status:401}
    );
  }


  const d=
    localData();


  const currentId=
    cur?.user?.id||
    cur?.id;


  const acct=
    currentId
      ?d[currentId]||null
      :null;


  if(!acct){

    throw Object.assign(
      Error(
        'Account data is unavailable.'
      ),
      {status:404}
    );
  }


  /* OVERVIEW */

  if(
    path==='/api/account/overview'
  ){

    return {
      user:acct.user,
      wallet:acct.wallet,
      profile:acct.profile,
      transactions:
        acct.transactions
          .slice(-8)
          .reverse(),
      local:true
    };
  }


  /* PROFILE GET */

  if(
    path==='/api/account/profile'&&
    method==='GET'
  ){

    return {
      profile:acct.profile,
      beneficiaries:
        acct.beneficiaries,
      local:true
    };
  }


  /* PROFILE UPDATE */

  if(
    path==='/api/account/profile'&&
    method==='PUT'
  ){

    acct.profile={
      ...acct.profile,
      ...body
    };


    acct.user={
      ...acct.user,

      name:[
        acct.profile.first_name,
        acct.profile.middle_name,
        acct.profile.last_name
      ]
        .filter(Boolean)
        .join(' ')||
        acct.user.name,

      phone:acct.profile.phone,
      country:acct.profile.country
    };


    d[currentId]=acct;


    writeJSON(
      LOCAL_DATA_KEY,
      d
    );


    saveSession(
      acct.user
    );


    return {
      profile:acct.profile,
      user:acct.user,
      local:true
    };
  }


  /* BENEFICIARY GET */

  if(
    path==='/api/account/beneficiary'&&
    method==='GET'
  ){

    return {
      beneficiaries:
        acct.beneficiaries,
      local:true
    };
  }


  /* BENEFICIARY CREATE */

  if(
    path==='/api/account/beneficiary'&&
    method==='POST'
  ){

    const num=
      String(
        body.accountNumber||''
      )
        .replace(/\D/g,'');


    if(num.length<6){

      throw Error(
        'Enter a valid bank account number.'
      );
    }


    const b={
      id:'ben_'+localToken(),
      bank_name:
        body.bankName||
        'Bank account',

      account_number_masked:
        '••••'+num.slice(-4),

      account_name:
        acct.user.name,

      verified:true
    };


    acct.beneficiaries.push(b);


    d[currentId]=acct;


    writeJSON(
      LOCAL_DATA_KEY,
      d
    );


    return {
      beneficiary:b,
      local:true
    };
  }


  /* NOTIFICATIONS */

  if(
    path==='/api/notifications'
  ){

    return {
      notifications:
        acct.notifications,
      local:true
    };
  }


  /* TRANSACTION HISTORY */

  if(
    path==='/api/transactions/history'
  ){

    return {
      deposits:
        acct.transactions.filter(
          x=>x.type==='deposit'
        ),

      withdrawals:
        acct.withdrawals,

      local:true
    };
  }


  /* LOCAL DEPOSIT */

  if(
    path==='/api/transactions/deposit'&&
    method==='POST'
  ){

    const amount=
      Math.round(
        Number(body.amount)*100
      );


    if(
      !Number.isFinite(amount)||
      amount<=0
    ){

      throw Error(
        'Enter a valid deposit amount.'
      );
    }


    const tx={
      id:'tx_'+localToken(),
      type:'deposit',
      amount_kobo:amount,
      status:'pending',

      provider_reference:
        'LOCAL-'+
        localToken()
          .slice(0,12)
          .toUpperCase(),

      description:'Deposit request',

      created_at:
        new Date().toISOString()
    };


    acct.transactions.push(tx);


    d[currentId]=acct;


    writeJSON(
      LOCAL_DATA_KEY,
      d
    );


    return {
      transaction:{
        reference:
          tx.provider_reference
      },
      status:'pending',
      local:true
    };
  }


  /* LOCAL WITHDRAWAL */

  if(
    path==='/api/transactions/withdraw'&&
    method==='POST'
  ){

    const amount=
      Math.round(
        Number(body.amount)*100
      );


    if(
      !Number.isFinite(amount)||
      amount<=0
    ){

      throw Error(
        'Enter a valid withdrawal amount.'
      );
    }


    if(
      amount>
      Number(acct.wallet.balance_kobo)-
      Number(acct.wallet.locked_kobo)
    ){

      throw Error(
        'Insufficient available balance.'
      );
    }


    acct.wallet.locked_kobo=
      Number(acct.wallet.locked_kobo)+
      amount;


    const beneficiary=
      acct.beneficiaries.find(
        x=>x.id===body.beneficiaryId
      )||{};


    const w={
      id:'wd_'+localToken(),

      provider_reference:
        'LOCAL-WD-'+
        localToken()
          .slice(0,12)
          .toUpperCase(),

      amount_kobo:amount,
      status:'pending_review',

      bank_name:
        beneficiary.bank_name||
        'Bank account',

      account_number_masked:
        beneficiary.account_number_masked||
        'Not selected',

      created_at:
        new Date().toISOString()
    };


    acct.withdrawals.push(w);


    d[currentId]=acct;


    writeJSON(
      LOCAL_DATA_KEY,
      d
    );


    return {
      request:{
        reference:
          w.provider_reference
      },
      local:true
    };
  }


  /* LOCAL PASSWORD CHANGE */

  if(
    path==='/api/auth/password'&&
    method==='POST'
  ){

    const u=
      localUsers().find(
        x=>x.id===currentId
      );


    if(!u){

      throw Error(
        'Account not found.'
      );
    }


    const old=
      await localHash(
        String(
          body.currentPassword||''
        ),
        u.salt
      );


    if(old!==u.hash){

      throw Error(
        'Current password is incorrect.'
      );
    }


    if(
      String(
        body.newPassword||''
      ).length<8
    ){

      throw Error(
        'New password must contain at least 8 characters.'
      );
    }


    u.salt=
      localToken();


    u.hash=
      await localHash(
        String(body.newPassword),
        u.salt
      );


    writeJSON(
      LOCAL_USERS_KEY,
      localUsers()
    );


    return {
      ok:true,
      local:true
    };
  }


  throw Object.assign(
    Error(
      'This account action requires the server connection.'
    ),
    {status:503}
  );
}


/* =========================================================
   SERVER API
   ========================================================= */

async function api(
  path,
  options={}
){

  const target=
    /^https?:\/\//i.test(path)
      ?path
      :`${API_BASE}${path}`;


  let res;


  try{

    res=
      await fetch(
        target,
        {
          ...options,

          headers:{
            'Accept':
              'application/json',

            ...(options.body
              ?{
                  'Content-Type':
                    'application/json'
                }
              :{}),

            ...(options.headers||{})
          },

          /*
           * REQUIRED FOR THE WORKER SESSION COOKIE.
           *
           * The browser must be allowed to send
           * aurevia_session to the Worker.
           */
          credentials:'include',

          /*
           * Explicit CORS request mode.
           */
          mode:'cors'
        }
      );

  }catch(e){

    /*
     * Only an actual network failure uses
     * the local-device fallback.
     *
     * HTTP errors from the Worker are NOT
     * silently converted into local mode.
     */

    return localRequest(
      path,
      options
    );
  }


  const type=
    res.headers.get(
      'content-type'
    )||'';


  const raw=
    await res.text();


  let data={};


  try{

    data=
      raw
        ?JSON.parse(raw)
        :{};

  }catch{}


  /* =======================================================
     SERVER AUTH FAILURE
     ======================================================= */

  if(
    res.status===401
  ){

    const e=
      Error(
        data.error||
        'Your Aurevia server session is not authenticated. Please sign in again.'
      );


    e.status=401;


    throw e;
  }


  /* =======================================================
     OTHER SERVER ERRORS
     ======================================================= */

  if(!res.ok){

    const e=
      Error(
        data.error||
        `Aurevia server returned HTTP ${res.status}.`
      );


    e.status=
      res.status;


    throw e;
  }


  /* =======================================================
     NON-JSON RESPONSE
     ======================================================= */

  if(
    !type.includes(
      'application/json'
    )
  ){

    throw Object.assign(
      Error(
        'The Aurevia API returned an invalid response.'
      ),
      {status:502}
    );
  }


  return data;
}


/* =========================================================
   SERVER SESSION VALIDATION
   ========================================================= */

async function validateServerSession(){

  try{

    const r=
      await api(
        '/api/auth/me'
      );


    if(
      r?.success&&
      r?.authenticated&&
      r?.user
    ){

      /*
       * Keep the UI copy of the user synchronized
       * with the real server account.
       */
      saveSession(
        r.user
      );

      return r.user;
    }


    return null;

  }catch(e){

    /*
     * A 401 means the browser has no usable
     * server session.
     */
    if(e.status===401){
      return null;
    }

    /*
     * If the API is temporarily unreachable,
     * do not destroy the local UI state.
     *
     * Protected API calls will still expose
     * the real server error.
     */
    return authSession()||null;
  }
}


/* =========================================================
   MONEY
   ========================================================= */

const money=k=>
  `₦${(
    Number(k||0)/100
  ).toLocaleString(
    'en-NG',
    {
      minimumFractionDigits:2,
      maximumFractionDigits:2
    }
  )}`;


/* =========================================================
   BOOT LOADER
   ========================================================= */

function setBootProgress(
  n,
  label
){

  $('#bootProgress')
    ?.style
    .setProperty(
      'width',
      n+'%'
    );


  if($('#bootPercent')){

    $('#bootPercent').textContent=
      n+'%';
  }


  if($('#bootStatus')){

    $('#bootStatus').textContent=
      label;
  }
}


async function bootLoader(){

  const l=
    $('#bootLoader');


  if(!l)return;


  if(
    sessionStorage.getItem(
      BOOT_KEY
    )
  ){

    l.remove();

    return;
  }


  const start=
    Date.now();


  for(
    const [n,t] of [
      [5,'Initializing 4D interface'],
      [18,'Loading secure identity'],
      [32,'Building account control layer'],
      [48,'Connecting transaction services'],
      [63,'Preparing wallet ledger'],
      [78,'Calibrating visual engine'],
      [91,'Finalizing workspace'],
      [100,'Aurevia ready']
    ]
  ){

    await new Promise(
      r=>setTimeout(
        r,
        700
      )
    );


    setBootProgress(
      n,
      t
    );
  }


  await new Promise(
    r=>setTimeout(
      r,
      Math.max(
        0,
        7000-
        (Date.now()-start)
      )
    )
  );


  sessionStorage.setItem(
    BOOT_KEY,
    '1'
  );


  l.classList.add(
    'done'
  );


  setTimeout(
    ()=>l.remove(),
    700
  );
}


const sleep=ms=>
  new Promise(
    r=>setTimeout(
      r,
      ms
    )
  );


/* =========================================================
   SECTION TRANSITION
   ========================================================= */

function sectionTransition(
  label='Loading section'
){

  let overlay=
    document.getElementById(
      'sectionLoader'
    );


  if(!overlay){

    overlay=
      document.createElement(
        'div'
      );


    overlay.id=
      'sectionLoader';


    overlay.className=
      'section-loader';


    overlay.innerHTML=`
      <div
        class="section-loader-scene"
        aria-hidden="true"
      >
        <div class="btc-coin btc-back">
          <span>₿</span>
        </div>

        <div class="btc-coin btc-front">
          <span>₿</span>
        </div>

        <i class="btc-glow"></i>
        <i class="btc-orbit"></i>
      </div>

      <div class="section-loader-title">
        AUREVIA
      </div>

      <div
        class="section-loader-label"
        id="sectionLoaderLabel"
      ></div>

      <div class="section-loader-line">
        <i></i>
      </div>
    `;


    document.body.appendChild(
      overlay
    );
  }


  overlay.classList.remove(
    'done'
  );


  overlay.classList.add(
    'show'
  );


  document.body.classList.add(
    'section-loading'
  );


  const el=
    overlay.querySelector(
      '#sectionLoaderLabel'
    );


  if(el){
    el.textContent=
      label;
  }


  const line=
    overlay.querySelector(
      '.section-loader-line i'
    );


  if(line){

    line.style.animation=
      'none';


    void line.offsetWidth;


    line.style.animation=
      'sectionLine 2s linear forwards';
  }


  return ()=>{

    overlay.classList.add(
      'done'
    );


    document.body.classList.remove(
      'section-loading'
    );


    setTimeout(
      ()=>overlay.remove(),
      420
    );
  };
}


async function withSectionTransition(
  label,
  fn
){

  const skip=
    sessionStorage.getItem(
      SECTION_READY_KEY
    )==='1';


  if(skip){

    sessionStorage.removeItem(
      SECTION_READY_KEY
    );
  }


  if(skip){
    return fn();
  }


  const hide=
    sectionTransition(
      label
    );


  let result;
  let error;


  try{

    result=
      await fn();

  }catch(e){

    error=e;
  }


  await sleep(
    2000
  );


  hide();


  if(error){
    throw error;
  }


  return result;
}


/* =========================================================
   AUTH INPUT
   ========================================================= */

function authInput(
  label,
  type,
  placeholder,
  required=true
){

  return `
    <label class="auth-label">
      ${label}

      <input
        name="${label}"
        type="${type}"
        placeholder="${placeholder}"
        ${required?'required':''}
      >
    </label>
  `;
}


/* =========================================================
   AUTH SCREEN
   ========================================================= */

function authScreen(){

  /*
   * Prevent duplicate auth screens.
   */
  document
    .querySelectorAll(
      '#authScreen'
    )
    .forEach(
      x=>x.remove()
    );


  const w=
    document.createElement(
      'div'
    );


  const initialTab=
    document.body.dataset.authTab===
    'register'
      ?'register'
      :'login';


  w.id=
    'authScreen';


  w.innerHTML=`

    <div class="auth-ambient">
      <i></i>
      <i></i>
      <i></i>
    </div>

    <div class="auth-shell">

      <div class="auth-brand">

        <img
          class="auth-logo-img"
          src="assets/images/aurevia-logo-3d.png"
          alt="Aurevia Investment PLC logo"
        >

        <div>
          <b>AUREVIA</b>
          <small>INVESTMENT PLC</small>
        </div>

      </div>


      <div class="auth-copy">

        <span class="eyebrow">
          SECURE ACCOUNT ACCESS
        </span>

        <h1>
          Build your financial workspace.<br>
          <em>
            Sign in or create your account.
          </em>
        </h1>

        <p>
          Your Aurevia account connects identity,
          profile data, wallet activity, payment
          records, withdrawals and account support
          in one secure workspace.
        </p>

        <div class="auth-features">
          <span>Encrypted account sessions</span>
          <span>Server-backed records</span>
          <span>Provider-confirmed payments</span>
        </div>

      </div>


      <div class="auth-card">

        <div class="auth-tabs">

          <button
            type="button"
            class="auth-tab ${
              initialTab==='login'
                ?'active'
                :''
            }"
            data-auth-tab="login"
          >
            Login
          </button>

          <button
            type="button"
            class="auth-tab ${
              initialTab==='register'
                ?'active'
                :''
            }"
            data-auth-tab="register"
          >
            Create account
          </button>

        </div>


        <form
          id="loginForm"
          class="auth-form ${
            initialTab==='login'
              ?''
              :'hidden'
          }"
        >

          ${authInput(
            'Email',
            'email',
            'Enter your email'
          )}

          ${authInput(
            'Password',
            'password',
            'Enter your password'
          )}

          <button
            type="submit"
            class="btn primary full"
          >
            Sign in securely
          </button>

        </form>


        <form
          id="registerForm"
          class="auth-form ${
            initialTab==='register'
              ?''
              :'hidden'
          }"
        >

          ${authInput(
            'Full name',
            'text',
            'Your full legal name'
          )}

          ${authInput(
            'Email',
            'email',
            'Your email address'
          )}

          ${authInput(
            'Phone',
            'tel',
            'Your phone number'
          )}

          ${authInput(
            'Country',
            'text',
            'Country of residence'
          )}

          ${authInput(
            'Password',
            'password',
            'Create a strong password'
          )}

          ${authInput(
            'Confirm password',
            'password',
            'Repeat your password'
          )}


          <label class="auth-check">

            <input
              type="checkbox"
              required
            >

            I confirm that the information I provide
            is accurate and I agree to the
            <a
              href="terms.html"
              target="_blank"
            >
              account terms
            </a>
            and
            <a
              href="privacy.html"
              target="_blank"
            >
              privacy notice
            </a>.

          </label>


          <button
            type="submit"
            class="btn primary full"
          >
            Create secure account
          </button>

        </form>


        <div
          id="authMessage"
          class="auth-message"
        ></div>

      </div>


      <div class="auth-foot">
        Aurevia Investment PLC ·
        Cloudflare Worker ·
        D1 account ledger
      </div>

    </div>
  `;


  document.body.appendChild(
    w
  );


  const login=
    w.querySelector(
      '#loginForm'
    );


  const reg=
    w.querySelector(
      '#registerForm'
    );


  const msg=
    w.querySelector(
      '#authMessage'
    );


  /* AUTH TABS */

  w.querySelectorAll(
    '[data-auth-tab]'
  ).forEach(
    b=>{

      b.onclick=()=>{

        w.querySelectorAll(
          '.auth-tab'
        ).forEach(
          x=>
            x.classList.remove(
              'active'
            )
        );


        b.classList.add(
          'active'
        );


        login.classList.toggle(
          'hidden',
          b.dataset.authTab!=='login'
        );


        reg.classList.toggle(
          'hidden',
          b.dataset.authTab!=='register'
        );


        msg.textContent='';


        document.body.dataset.authTab=
          b.dataset.authTab;
      };
    }
  );


  /* =======================================================
     LOGIN
     ======================================================= */

  login.onsubmit=
    async e=>{

      e.preventDefault();


      const submit=
        login.querySelector(
          'button[type="submit"]'
        );


      if(submit){
        submit.disabled=true;
      }


      msg.textContent=
        'Signing in securely…';


      const f=
        new FormData(login);


      try{

        const r=
          await api(
            '/api/auth/login',
            {
              method:'POST',

              body:
                JSON.stringify({
                  email:
                    f.get('Email'),

                  password:
                    f.get('Password')
                })
            }
          );


        if(!r?.user){

          throw Error(
            'Account service returned an invalid session.'
          );
        }


        /*
         * The secure authentication token is NOT
         * saved in localStorage.
         *
         * It remains in the HttpOnly cookie
         * issued by the Worker.
         */
        saveSession(
          r.user
        );


        msg.textContent=
          'Login successful. Opening your account…';


        const next=
          new URLSearchParams(
            location.search
          ).get('next');


        setTimeout(
          ()=>{

            location.replace(
              next==='admin'
                ?'admin/index.html'
                :'index.html'
            );

          },
          150
        );


      }catch(e){

        msg.textContent=
          e.message||
          'Sign in could not be completed.';

      }finally{

        if(submit){
          submit.disabled=false;
        }
      }
    };


  /* =======================================================
     REGISTER
     ======================================================= */

  reg.onsubmit=
    async e=>{

      e.preventDefault();


      const submit=
        reg.querySelector(
          'button[type="submit"]'
        );


      if(submit){
        submit.disabled=true;
      }


      msg.textContent=
        'Creating your secure account…';


      const f=
        new FormData(reg);


      const password=
        String(
          f.get('Password')||''
        );


      const confirm=
        String(
          f.get('Confirm password')||''
        );


      if(
        password!==confirm
      ){

        msg.textContent=
          'Passwords do not match.';

        if(submit){
          submit.disabled=false;
        }

        return;
      }


      const payload={
        name:
          f.get('Full name'),

        email:
          f.get('Email'),

        phone:
          f.get('Phone'),

        country:
          f.get('Country'),

        password
      };


      try{

        /*
         * First create the account on D1.
         */
        const r=
          await api(
            '/api/auth/register',
            {
              method:'POST',

              body:
                JSON.stringify(
                  payload
                )
            }
          );


        if(!r?.user){

          throw Error(
            'Account creation did not return an account.'
          );
        }


        /*
         * IMPORTANT:
         *
         * Registration may create the user but
         * may not create a Worker session.
         *
         * Therefore immediately perform a real
         * server login. This causes the Worker to
         * issue aurevia_session.
         */
        msg.textContent=
          'Account created. Establishing secure session…';


        const loginResult=
          await api(
            '/api/auth/login',
            {
              method:'POST',

              body:
                JSON.stringify({
                  email:
                    payload.email,

                  password:
                    payload.password
                })
            }
          );


        if(
          !loginResult?.user
        ){

          throw Error(
            'Account was created, but the secure login session could not be established.'
          );
        }


        saveSession(
          loginResult.user
        );


        msg.textContent=
          'Account created successfully. Opening your dashboard…';


        setTimeout(
          ()=>{
            location.replace(
              'index.html'
            );
          },
          150
        );


      }catch(e){

        msg.textContent=
          e.message||
          'Account creation could not be completed.';

      }finally{

        if(submit){
          submit.disabled=false;
        }
      }
    };
}


/* =========================================================
   AUTH STATE
   ========================================================= */

async function requireAuth(){

  const current=
    authSession();


  /*
   * No local UI session means immediately show
   * the login screen.
   */
  if(
    !current||
    !current.email
  ){

    $('#app').style.display=
      'none';

    authScreen();

    return false;
  }


  /*
   * Validate the real Worker session.
   *
   * If the browser sends the HttpOnly cookie,
   * /api/auth/me returns the authoritative
   * account information.
   */
  const serverUser=
    await validateServerSession();


  if(!serverUser){

    clearSession();


    $('#app').style.display=
      'none';


    authScreen();


    return false;
  }


  $('#app').style.display=
    'block';


  const nameEl=
    document.querySelector(
      '.profile-copy b'
    );


  const emailEl=
    document.querySelector(
      '.profile-copy small'
    );


  const avatar=
    document.querySelector(
      '.avatar'
    );


  if(nameEl){

    nameEl.textContent=
      serverUser.name||
      'Account';
  }


  if(emailEl){

    emailEl.textContent=
      serverUser.email||
      'Secure account';
  }


  if(avatar){

    const initials=
      String(
        serverUser.name||
        'A'
      )
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0,2)
        .map(
          x=>x[0]
        )
        .join('')
        .toUpperCase();


    avatar.textContent=
      initials||
      'A';
  }


  return true;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

const navItems=[
  ['▦','Dashboard','dashboard'],
  ['＋','Make Deposit','deposit'],
  ['▤','Deposit History','history'],
  ['⌁','Trade History','trades'],
  ['↙','Make Withdrawal','withdraw'],
  ['▤','Withdrawal History','withdraw-history'],
  ['◈','Markets','markets'],
  ['♙','View Profile','profile'],
  ['⇧','Account Upgrade','upgrade'],
  ['✎','Change Password','password'],
  ['⚙','Settings','settings'],
  ['◉','Notifications','notifications'],
  ['?','Help Center','help'],
  ['↪','Logout','logout']
];


const pages={
  dashboard:[
    'Dashboard',
    'OVERVIEW'
  ],

  deposit:[
    'Make Deposit',
    'FUNDING'
  ],

  history:[
    'Deposit History',
    'ACTIVITY'
  ],

  trades:[
    'Trade History',
    'MARKET ACTIVITY'
  ],

  withdraw:[
    'Make Withdrawal',
    'WITHDRAWAL'
  ],

  'withdraw-history':[
    'Withdrawal History',
    'WITHDRAWAL ACTIVITY'
  ],

  markets:[
    'Markets',
    'MARKET OVERVIEW'
  ],

  profile:[
    'View Profile',
    'PERSONAL DATA'
  ],

  upgrade:[
    'Account Upgrade',
    'PLANS'
  ],

  password:[
    'Change Password',
    'SECURITY'
  ],

  settings:[
    'Settings',
    'PREFERENCES'
  ],

  notifications:[
    'Notifications',
    'ALERT CENTER'
  ],

  help:[
    'Help Center',
    'SUPPORT'
  ],

  logout:[
    'Logout',
    'SESSION'
  ]
};


/* =========================================================
   NAV
   ========================================================= */

function nav(){

  const n=
    $('#nav');


  if(!n)return;


  n.innerHTML=
    navItems
      .map(
        ([i,t,p])=>
          `<a
            class="nav-item"
            href="${
              p==='dashboard'
                ?'index.html'
                :p+'.html'
            }"
            data-page="${p}"
          >
            <span class="nav-icon">
              ${i}
            </span>

            <span>
              ${t}
            </span>
          </a>`
      )
      .join('');
}


/* =========================================================
   SHELL
   ========================================================= */

function shell(
  title,
  eyebrow,
  body
){

  appContent.innerHTML=`

    <div class="page-title">

      <div>

        <span class="eyebrow">
          ${eyebrow}
        </span>

        <h1>
          ${title}
        </h1>

      </div>


      <div class="page-title-actions">

        <a
          class="btn secondary"
          href="index.html"
        >
          ⌂ Home
        </a>

        <span class="pill">
          SECURE WORKFLOW
        </span>

      </div>

    </div>

    ${body}
  `;
}


/* =========================================================
   CARD
   ========================================================= */

function card(
  t,
  e,
  b,
  c=''
){

  return `
    <article class="card ${c}">

      <div class="card-head">

        <div>

          <span class="eyebrow">
            ${e||''}
          </span>

          <h2>
            ${t}
          </h2>

        </div>

      </div>

      ${b}

    </article>
  `;
}


/* =========================================================
   INPUT
   ========================================================= */

function input(
  l,
  t='text',
  p='',
  req=true
){

  return `
    <label class="form-label">

      ${l}

      <input
        type="${t}"
        placeholder="${p}"
        ${req?'required':''}
      >

    </label>
  `;
}


function valueInput(
  l,
  t='text',
  v=''
){

  return `
    <label class="form-label">

      ${l}

      <input
        type="${t}"
        value="${esc(v)}"
      >

    </label>
  `;
}


/* =========================================================
   SERVER NOTICE
   ========================================================= */

function liveNotice(){

  return `
    <div class="notice">

      <b>CONNECTED</b>

      <span>
        Actions are routed through the Aurevia
        server. Payment settlement occurs only
        when the configured provider confirms
        the transaction.
      </span>

      <span class="server-badge">
        SERVER
      </span>

    </div>
  `;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard(){

  let o;


  try{

    o=
      await api(
        '/api/account/overview'
      );

  }catch(e){

    return shell(
      'Dashboard',
      'ACCOUNT',

      `
        <div class="notice">

          <b>ACCOUNT ERROR</b>

          <span>
            ${esc(e.message)}
          </span>

        </div>
      `
    );
  }


  const w=
    o.wallet||{};


  shell(
    `Welcome back, ${esc(
      o.user?.name||
      'Account'
    )}`,

    'PERSONAL DASHBOARD',

    `
      ${liveNotice()}


      <section
        class="hero hero-4d"
      >

        <div class="hero-depth">

          <p class="muted">
            Your live account ledger,
            payment activity and security status.
          </p>

          <div class="hero-actions">

            <a
              class="btn secondary"
              href="deposit.html"
            >
              Make deposit
            </a>

            <a
              class="btn primary"
              href="withdraw.html"
            >
              Request withdrawal
            </a>

          </div>

        </div>

      </section>


      <section class="stat-grid">

        <div class="stat">

          <div class="label">
            Available balance
          </div>

          <div class="value">
            ${money(
              Number(w.balance_kobo)-
              Number(w.locked_kobo)
            )}
          </div>

          <div class="sub">
            NGN wallet
          </div>

        </div>


        <div class="stat">

          <div class="label">
            Wallet balance
          </div>

          <div class="value">
            ${money(
              w.balance_kobo
            )}
          </div>

          <div class="sub">
            Ledger balance
          </div>

        </div>


        <div class="stat">

          <div class="label">
            Locked funds
          </div>

          <div class="value">
            ${money(
              w.locked_kobo
            )}
          </div>

          <div class="sub">
            Pending operations
          </div>

        </div>


        <div class="stat">

          <div class="label">
            Identity
          </div>

          <div class="value">
            ${esc(
              o.profile?.identity_status||
              'pending'
            )}
          </div>

          <div class="sub">
            Verification status
          </div>

        </div>

      </section>


      <section
        class="dashboard-live-section"
      >

        ${card(
          'Live trade monitor',
          'ADMINISTRATOR FEED',

          `
            <div
              id="dashboardLiveTradesMount"
            ></div>

            <p class="muted">
              Only administrator-published
              server trade records appear here.
              The chart is a monitoring visualization
              and does not execute orders.
            </p>
          `
        )}

      </section>


      <section class="grid-2">

        ${card(
          'Wallet activity',
          'RECENT TRANSACTIONS',

          `
            <div class="activity-list">

              ${
                (o.transactions||[])
                  .map(
                    x=>`

                      <div class="activity-row">

                        <div class="activity-icon">
                          ${
                            x.type==='deposit'
                              ?'↗'
                              :'↙'
                          }
                        </div>

                        <div class="activity-main">

                          <b>
                            ${esc(
                              x.description||
                              x.type
                            )}
                          </b>

                          <small>
                            ${esc(
                              x.provider_reference||
                              ''
                            )}
                            ·
                            ${esc(
                              x.created_at
                            )}
                          </small>

                        </div>

                        <div
                          class="activity-amt ${
                            x.type==='deposit'
                              ?'positive'
                              :'negative'
                          }"
                        >
                          ${
                            x.type==='deposit'
                              ?'+'
                              :'-'
                          }${money(
                            x.amount_kobo
                          )}
                        </div>

                      </div>
                    `
                  )
                  .join('')||
                  '<p class="muted">No transactions yet.</p>'
              }

            </div>
          `
        )}


        ${card(
          'Account completion',
          'SECURITY & KYC',

          `
            <div class="verify-row">

              <span>
                Personal profile
              </span>

              <b>
                ${
                  o.profile?.phone&&
                  o.profile?.address_line1
                    ?'Complete'
                    :'Incomplete'
                }
              </b>

            </div>


            <div class="verify-row">

              <span>
                Identity verification
              </span>

              <b>
                ${esc(
                  o.profile?.identity_status||
                  'pending'
                )}
              </b>

            </div>


            <div class="verify-row">

              <span>
                Address verification
              </span>

              <b>
                ${esc(
                  o.profile?.address_status||
                  'pending'
                )}
              </b>

            </div>


            <a
              class="btn primary full"
              href="profile.html"
            >
              Complete profile
            </a>
          `
        )}

      </section>
    `
  );


  if(o.local){

    const m=
      $('#dashboardLiveTradesMount');


    if(m){

      m.innerHTML=`
        <div class="trade-empty">

          <h3>
            Server trade feed not connected
          </h3>

          <p>
            This device account is local-only
            until the Cloudflare D1 account
            backend is connected.
          </p>

        </div>
      `;
    }

  }else{

    loadLiveTrades({
      containerId:
        'dashboardLiveTradesMount'
    });
  }
}


/* =========================================================
   DEPOSIT
   ========================================================= */

async function deposit(){

  shell(
    'Make Deposit',
    'FUNDING',

    `
      ${liveNotice()}

      <section class="grid-2">

        ${card(
          'Fund your wallet',
          'PAYMENT',

          `
            <div class="form-grid">

              ${input(
                'Amount (NGN)',
                'number',
                '1000'
              )}

              ${input(
                'Reference note',
                'text',
                'Optional note'
              )}

            </div>

            <p class="muted">
              You will be redirected to the
              configured payment provider.
              Aurevia credits the wallet only
              after provider confirmation.
            </p>

            <button
              class="btn primary"
              id="startDeposit"
            >
              Continue to secure payment
            </button>

            <div
              id="depositResult"
              class="auth-message"
            ></div>
          `
        )}


        ${card(
          'Deposit workflow',
          'SECURE SETTLEMENT',

          `
            <ol class="steps">

              <li>
                Create a unique payment reference.
              </li>

              <li>
                Open the provider checkout.
              </li>

              <li>
                Provider confirms payment by
                callback/webhook.
              </li>

              <li>
                Ledger credits the wallet once,
                with duplicate protection.
              </li>

            </ol>
          `
        )}

      </section>
    `
  );


  $('#startDeposit').onclick=
    async()=>{

      const amount=
        $('#startDeposit')
          .parentElement
          .querySelector(
            'input[type=number]'
          ).value;


      try{

        const r=
          await api(
            '/api/transactions/deposit',
            {
              method:'POST',

              body:
                JSON.stringify({
                  amount,
                  currency:'NGN'
                })
            }
          );


        if(r.local){

          $('#depositResult')
            .innerHTML=`
              Payment request
              <b>
                ${esc(
                  r.transaction.reference
                )}
              </b>
              created and is awaiting
              provider connection.
            `;

          return;
        }


        $('#depositResult')
          .innerHTML=`
            Payment reference:
            <b>
              ${esc(
                r.transaction.reference
              )}
            </b>
          `;


        if(
          r.authorization_url
        ){

          location.href=
            r.authorization_url;
        }

      }catch(e){

        $('#depositResult')
          .textContent=
            e.message;
      }
    };


  const ref=
    new URLSearchParams(
      location.search
    ).get('reference');


  if(ref){

    try{

      const r=
        await api(
          '/api/transactions/verify?reference='+
          encodeURIComponent(ref)
        );


      $('#depositResult')
        .textContent=
          r.status==='success'
            ?'Payment confirmed and wallet credited.'
            :`Payment status: ${r.status}`;

    }catch(e){

      $('#depositResult')
        .textContent=
          e.message;
    }
  }
}


/* =========================================================
   DEPOSIT HISTORY
   ========================================================= */

async function historyPage(){

  try{

    const r=
      await api(
        '/api/transactions/history'
      );


    shell(
      'Deposit History',
      'ACTIVITY',

      `
        ${liveNotice()}

        ${card(
          'Deposits',
          'PAYMENT RECORDS',

          `
            <div class="table-scroll">

              <table>

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  ${
                    (r.deposits||[])
                      .map(
                        x=>`

                          <tr>

                            <td>
                              ${esc(
                                x.created_at
                              )}
                            </td>

                            <td>
                              ${esc(
                                x.provider_reference
                              )}
                            </td>

                            <td>
                              ${money(
                                x.amount_kobo
                              )}
                            </td>

                            <td>

                              <span
                                class="status-chip"
                              >
                                ${esc(
                                  x.status
                                )}
                              </span>

                            </td>

                          </tr>
                        `
                      )
                      .join('')||

                      `
                        <tr>

                          <td colspan="4">
                            No deposits yet.
                          </td>

                        </tr>
                      `
                  }

                </tbody>

              </table>

            </div>
          `
        )}
      `
    );

  }catch(e){

    shell(
      'Deposit History',
      'ACTIVITY',

      `
        <div class="notice">

          <b>ERROR</b>

          <span>
            ${esc(e.message)}
          </span>

        </div>
      `
    );
  }
}


/* =========================================================
   TRADES
   ========================================================= */

function trades(){

  shell(
    'Live Trade Desk',
    'MARKET ACTIVITY',

    `
      ${liveNotice()}

      ${card(
        'Administrator live trades',
        'SERVER CONTROLLED FEED',

        `
          <div
            id="liveTradesMount"
          ></div>
        `
      )}
    `
  );


  loadLiveTrades();
}


/* =========================================================
   WITHDRAWAL
   ========================================================= */

async function withdraw(){

  let profile;
  let bens;


  try{

    profile=
      (
        await api(
          '/api/account/profile'
        )
      ).profile;


    bens=
      (
        await api(
          '/api/account/beneficiary'
        )
      ).beneficiaries||[];

  }catch(e){

    return shell(
      'Make Withdrawal',
      'WITHDRAWAL',

      `
        <div class="notice">

          <b>ERROR</b>

          <span>
            ${esc(e.message)}
          </span>

        </div>
      `
    );
  }


  shell(
    'Make Withdrawal',
    'WITHDRAWAL',

    `
      ${liveNotice()}

      <section class="grid-2">

        ${card(
          'Withdrawal request',
          'BANK TRANSFER',

          `
            <div class="form-grid">

              ${input(
                'Amount (NGN)',
                'number',
                '10000'
              )}

              <label class="form-label">

                Verified beneficiary

                <select id="beneficiary">

                  ${
                    bens.map(
                      b=>`

                        <option
                          value="${esc(b.id)}"
                        >
                          ${esc(
                            b.bank_name||
                            'Bank'
                          )}
                          ·
                          ${esc(
                            b.account_number_masked
                          )}
                          ·
                          ${esc(
                            b.account_name
                          )}
                        </option>
                      `
                    ).join('')||

                    `
                      <option value="">
                        No beneficiary yet
                      </option>
                    `
                  }

                </select>

              </label>

            </div>


            <button
              class="btn primary"
              id="requestWithdrawal"
            >
              Submit withdrawal request
            </button>


            <div
              id="withdrawResult"
              class="auth-message"
            ></div>
          `
        )}


        ${card(
          'Bank beneficiary',
          'VERIFY FIRST',

          `
            <div class="form-grid">

              ${input(
                'Bank code',
                'text',
                'e.g. 058'
              )}

              ${input(
                '10-digit account number',
                'text',
                '0123456789'
              )}

              ${input(
                'Bank name',
                'text',
                'Optional display name'
              )}

            </div>


            <button
              class="btn secondary"
              id="addBeneficiary"
            >
              Verify and save bank account
            </button>


            <p class="muted">
              The server resolves the account
              before saving it as a beneficiary.
            </p>
          `
        )}


        ${card(
          'Compliance status',
          'ACCOUNT',

          `
            <div class="verify-row">

              <span>
                Identity
              </span>

              <b>
                ${esc(
                  profile?.identity_status||
                  'pending'
                )}
              </b>

            </div>


            <div class="verify-row">

              <span>
                Address
              </span>

              <b>
                ${esc(
                  profile?.address_status||
                  'pending'
                )}
              </b>

            </div>


            <div class="notice compact">

              <b>CONTROL</b>

              <span>
                Withdrawal requests are locked
                against the wallet and require
                administrator/provider processing
                before settlement.
              </span>

            </div>
          `
        )}

      </section>
    `
  );


  $('#addBeneficiary').onclick=
    async()=>{

      const cardEl=
        $('#addBeneficiary')
          .closest('.card');


      const ins=[
        ...cardEl.querySelectorAll(
          'input'
        )
      ];


      try{

        const r=
          await api(
            '/api/account/beneficiary',
            {
              method:'POST',

              body:
                JSON.stringify({
                  bankCode:
                    ins[0]?.value||'',

                  accountNumber:
                    ins[1]?.value||'',

                  bankName:
                    ins[2]?.value||''
                })
            }
          );


        toast(
          `Verified account: ${
            r.beneficiary.account_name
          }`
        );


        location.reload();

      }catch(e){

        toast(
          e.message
        );
      }
    };


  $('#requestWithdrawal').onclick=
    async()=>{

      const amount=
        document.querySelector(
          'input[type=number]'
        ).value;


      const beneficiaryId=
        $('#beneficiary').value;


      try{

        const r=
          await api(
            '/api/transactions/withdraw',
            {
              method:'POST',

              body:
                JSON.stringify({
                  amount,
                  beneficiaryId
                })
            }
          );


        $('#withdrawResult')
          .textContent=
            `Request ${
              r.request.reference
            } submitted for review.`;

      }catch(e){

        $('#withdrawResult')
          .textContent=
            e.message;
      }
    };
}


/* =========================================================
   WITHDRAWAL HISTORY
   ========================================================= */

async function withdrawHistory(){

  try{

    const r=
      await api(
        '/api/transactions/history'
      );


    shell(
      'Withdrawal History',
      'WITHDRAWAL ACTIVITY',

      `
        ${liveNotice()}

        ${card(
          'Withdrawal requests',
          'SETTLEMENT STATUS',

          `
            <div class="table-scroll">

              <table>

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Bank</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>

                </thead>


                <tbody>

                  ${
                    (r.withdrawals||[])
                      .map(
                        x=>`

                          <tr>

                            <td>
                              ${esc(
                                x.created_at
                              )}
                            </td>

                            <td>
                              ${esc(
                                x.provider_reference
                              )}
                            </td>

                            <td>
                              ${esc(
                                x.bank_name
                              )}
                              ·
                              ${esc(
                                x.account_number_masked
                              )}
                            </td>

                            <td>
                              ${money(
                                x.amount_kobo
                              )}
                            </td>

                            <td>

                              <span
                                class="status-chip"
                              >
                                ${esc(
                                  x.status
                                )}
                              </span>

                            </td>

                          </tr>
                        `
                      )
                      .join('')||

                      `
                        <tr>

                          <td colspan="5">
                            No withdrawal requests.
                          </td>

                        </tr>
                      `
                  }

                </tbody>

              </table>

            </div>
          `
        )}

      `
    );

  }catch(e){

    shell(
      'Withdrawal History',
      'WITHDRAWAL ACTIVITY',

      `
        <div class="notice">

          <b>ERROR</b>

          <span>
            ${esc(e.message)}
          </span>

        </div>
      `
    );
  }
}


/* =========================================================
   MARKETS
   ========================================================= */

function marketsPage(){

  shell(
    'Markets',
    'MARKET OVERVIEW',

    `
      ${liveNotice()}

      ${card(
        'Running market engine',
        '4D MARKET VIEW',

        `
          <div
            id="liveTradesMount"
          ></div>

          <p class="chart-attribution">
            Chart engine is Aurevia custom canvas
            rendering. Prices shown here are
            administrator-published feed values
            unless a separate market-data provider
            is connected.
          </p>
        `
      )}
    `
  );


  loadLiveTrades();
}


/* =========================================================
   PROFILE
   ========================================================= */

async function profile(){

  let r;


  try{

    r=
      await api(
        '/api/account/profile'
      );

  }catch(e){

    return shell(
      'View Profile',
      'PERSONAL DATA',

      `
        <div class="notice">

          <b>ERROR</b>

          <span>
            ${esc(e.message)}
          </span>

        </div>
      `
    );
  }


  const p=
    r.profile||{};


  shell(
    'View Profile',
    'PERSONAL DATA',

    `
      ${liveNotice()}

      <section class="grid-2">

        ${card(
          'Personal identity',
          'ACCOUNT DATA',

          `
            <div class="form-grid">

              ${valueInput(
                'First name',
                'text',
                p.first_name
              )}

              ${valueInput(
                'Middle name',
                'text',
                p.middle_name
              )}

              ${valueInput(
                'Last name',
                'text',
                p.last_name
              )}

              ${valueInput(
                'Phone',
                'tel',
                p.phone
              )}

              ${valueInput(
                'Date of birth',
                'date',
                p.date_of_birth
              )}

              ${valueInput(
                'Occupation',
                'text',
                p.occupation
              )}

              ${valueInput(
                'Nationality',
                'text',
                p.nationality
              )}

              ${valueInput(
                'Gender',
                'text',
                p.gender
              )}

            </div>
          `
        )}


        ${card(
          'Address & residency',
          'RESIDENTIAL DATA',

          `
            <div class="form-grid">

              ${valueInput(
                'Country',
                'text',
                p.country
              )}

              ${valueInput(
                'State',
                'text',
                p.state
              )}

              ${valueInput(
                'City',
                'text',
                p.city
              )}

              ${valueInput(
                'Address line 1',
                'text',
                p.address_line1
              )}

              ${valueInput(
                'Address line 2',
                'text',
                p.address_line2
              )}

              ${valueInput(
                'Postal code',
                'text',
                p.postal_code
              )}

              ${valueInput(
                'Timezone',
                'text',
                p.timezone||
                'Africa/Lagos'
              )}

              ${valueInput(
                'Tax residency',
                'text',
                p.tax_residency
              )}

            </div>
          `
        )}

      </section>


      <section class="grid-2">

        ${card(
          'Financial profile',
          'ACCOUNT INFORMATION',

          `
            <div class="form-grid">

              ${valueInput(
                'Employer / business',
                'text',
                p.employer_name
              )}

              ${valueInput(
                'Source of funds',
                'text',
                p.source_of_funds
              )}

            </div>

            <p class="muted">
              Only enter information required
              for your account and applicable
              verification processes.
            </p>
          `
        )}


        ${card(
          'Verification',
          'KYC STATUS',

          `
            <div class="verify-row">

              <span>
                Identity
              </span>

              <b>
                ${esc(
                  p.identity_status||
                  'pending'
                )}
              </b>

            </div>


            <div class="verify-row">

              <span>
                Address
              </span>

              <b>
                ${esc(
                  p.address_status||
                  'pending'
                )}
              </b>

            </div>


            <p class="muted">
              Verification decisions are
              controlled by authorized
              operations staff.
            </p>
          `
        )}

      </section>


      <button
        class="btn primary"
        id="saveProfile"
      >
        Save personal data
      </button>


      <section
        class="grid-2 profile-status"
      >

        ${card(
          'Beneficiaries',
          'BANK ACCOUNTS',

          `
            <div>

              ${
                (r.beneficiaries||[])
                  .map(
                    b=>`

                      <div
                        class="verify-row"
                      >

                        <span>
                          ${esc(
                            b.bank_name||
                            'Bank'
                          )}
                          ·
                          ${esc(
                            b.account_number_masked
                          )}
                        </span>

                        <b>
                          ${esc(
                            b.account_name
                          )}
                        </b>

                      </div>
                    `
                  )
                  .join('')||

                  `
                    <p class="muted">
                      No saved bank account.
                    </p>
                  `
              }

            </div>
          `
        )}


        ${card(
          'Account security',
          'SECURITY',

          `
            <div class="verify-row">

              <span>
                Two-factor authentication
              </span>

              <b>
                ${
                  p.two_factor_enabled
                    ?'Enabled'
                    :'Not enabled'
                }
              </b>

            </div>


            <a
              class="btn secondary"
              href="password.html"
            >
              Change password
            </a>
          `
        )}

      </section>
    `
  );


  $('#saveProfile').onclick=
    async()=>{

      const names=[
        'first_name',
        'middle_name',
        'last_name',
        'phone',
        'date_of_birth',
        'occupation',
        'nationality',
        'gender',
        'country',
        'state',
        'city',
        'address_line1',
        'address_line2',
        'postal_code',
        'timezone',
        'tax_residency',
        'employer_name',
        'source_of_funds'
      ];


      const all=[
        ...document.querySelectorAll(
          '.content .form-label input'
        )
      ];


      const body=
        Object.fromEntries(
          names.map(
            (n,i)=>[
              n,
              all[i]?.value.trim()||''
            ]
          )
        );


      try{

        await api(
          '/api/account/profile',
          {
            method:'PUT',

            body:
              JSON.stringify(body)
          }
        );


        toast(
          'Personal data saved.'
        );


        location.reload();

      }catch(e){

        toast(
          e.message
        );
      }
    };
}


/* =========================================================
   UPGRADE
   ========================================================= */

async function upgrade(){

  const s=
    authSession()||{};


  shell(
    'Account Upgrade',
    'PLANS',

    `
      ${liveNotice()}

      <section class="plan-grid">

        ${
          [
            [
              'Basic',
              'Current',
              'Core account operations'
            ],

            [
              'Premium',
              '₦15,000',
              'Expanded account controls'
            ],

            [
              'VIP',
              '₦50,000',
              'Advanced account services'
            ]
          ]

          .map(
            (p,i)=>
              card(
                p[0],
                'PLAN',

                `
                  <div class="plan-price">
                    ${p[1]}
                  </div>

                  <p>
                    ${p[2]}
                  </p>

                  <ul class="checklist">

                    <li>
                      Secure account
                    </li>

                    <li>
                      Wallet ledger
                    </li>

                    <li>
                      Transaction history
                    </li>

                  </ul>


                  <button
                    class="btn ${
                      i
                        ?'primary'
                        :'secondary'
                    } full"
                    data-plan="${p[0]}"
                  >
                    ${
                      s.plan===p[0]
                        ?'Current plan'
                        :i
                          ?'Pay & upgrade'
                          :'Current plan'
                    }
                  </button>
                `,

                'plan-card'
              )
          )
          .join('')
        }

      </section>


      <div
        id="upgradeResult"
        class="auth-message"
      ></div>
    `
  );


  document
    .querySelectorAll(
      '[data-plan]'
    )
    .forEach(
      b=>{

        b.onclick=
          async()=>{

            const plan=
              b.dataset.plan;


            if(
              plan==='Basic'||
              plan===s.plan
            ){

              return toast(
                'No upgrade is required.'
              );
            }


            try{

              const r=
                await api(
                  '/api/transactions/upgrade',
                  {
                    method:'POST',

                    body:
                      JSON.stringify({
                        plan
                      })
                  }
                );


              if(
                r.authorization_url
              ){

                location.href=
                  r.authorization_url;
              }

            }catch(e){

              $('#upgradeResult')
                .textContent=
                  e.message;
            }
          };
      }
    );


  const ref=
    new URLSearchParams(
      location.search
    ).get('reference');


  if(ref){

    try{

      const r=
        await api(
          '/api/transactions/verify?reference='+
          encodeURIComponent(ref)
        );


      $('#upgradeResult')
        .textContent=
          r.status==='success'
            ?'Upgrade payment confirmed. Refreshing account…'
            :`Payment status: ${r.status}`;


      if(
        r.status==='success'
      ){

        setTimeout(
          ()=>location.href=
            'index.html',
          900
        );
      }

    }catch(e){

      $('#upgradeResult')
        .textContent=
          e.message;
    }
  }
}


/* =========================================================
   PASSWORD
   ========================================================= */

function password(){

  shell(
    'Change Password',
    'SECURITY',

    `
      ${liveNotice()}

      ${card(
        'Password',
        'ACCOUNT SECURITY',

        `
          <div class="form-grid">

            ${input(
              'Current password',
              'password',
              'Current password'
            )}

            ${input(
              'New password',
              'password',
              'At least 8 characters'
            )}

            ${input(
              'Confirm password',
              'password',
              'Repeat new password'
            )}

          </div>


          <button
            class="btn primary"
            id="savePassword"
          >
            Update password
          </button>
        `
      )}
    `
  );


  $('#savePassword').onclick=
    async()=>{

      const x=[
        ...document.querySelectorAll(
          '.form-label input'
        )
      ].map(
        i=>i.value
      );


      if(x[1]!==x[2]){

        return toast(
          'Passwords do not match.'
        );
      }


      try{

        await api(
          '/api/auth/password',
          {
            method:'POST',

            body:
              JSON.stringify({
                currentPassword:x[0],
                newPassword:x[1]
              })
          }
        );


        toast(
          'Password updated.'
        );

      }catch(e){

        toast(
          e.message
        );
      }
    };
}


/* =========================================================
   SETTINGS
   ========================================================= */

function settings(){

  shell(
    'Settings',
    'PREFERENCES',

    `
      ${card(
        'Interface',
        '4D EXPERIENCE',

        `
          <div
            class="settings-page-grid"
          >

            <label class="form-label">

              Mode

              <select>

                <option>
                  Midnight 4D
                </option>

                <option>
                  Light glass
                </option>

              </select>

            </label>


            <label class="form-label">

              Motion

              <select>

                <option>
                  Full motion
                </option>

                <option>
                  Reduced
                </option>

              </select>

            </label>

          </div>


          <button
            class="btn primary"
            onclick="
              localStorage.setItem(
                'aurevia_motion',
                'saved'
              );
              location.reload()
            "
          >
            Save preferences
          </button>
        `
      )}


      ${card(
        'Security',
        'ACCOUNT CONTROLS',

        `
          <p class="muted">
            Session cookies are managed
            server-side. Financial actions
            require authenticated server
            requests.
          </p>
        `
      )}
    `
  );
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function notifications(){

  try{

    const r=
      await api(
        '/api/notifications'
      );


    shell(
      'Notifications',
      'ALERT CENTER',

      card(
        'Account notifications',
        'LATEST',

        `
          <div>

            ${
              (r.notifications||[])
                .map(
                  n=>`

                    <div
                      class="notification"
                    >

                      <b>
                        ${esc(
                          n.title
                        )}
                      </b>

                      <p>
                        ${esc(
                          n.body
                        )}
                      </p>

                      <small>
                        ${esc(
                          n.created_at
                        )}
                      </small>

                    </div>
                  `
                )
                .join('')||

                `
                  <p class="muted">
                    No notifications.
                  </p>
                `
            }

          </div>
        `
      )
    );

  }catch(e){

    shell(
      'Notifications',
      'ALERT CENTER',

      `
        <div class="notice">

          <b>ERROR</b>

          <span>
            ${esc(e.message)}
          </span>

        </div>
      `
    );
  }
}


/* =========================================================
   HELP
   ========================================================= */

function help(){

  shell(
    'Help Center',
    'SUPPORT',

    `
      ${card(
        'Account operations',
        'HOW YOUR ACCOUNT WORKS',

        `
          <details open>

            <summary>
              How do payments work?
            </summary>

            <p class="muted">
              Aurevia creates a unique
              server-side payment reference
              and sends you to the configured
              provider checkout. Your wallet
              is updated only after provider
              confirmation.
            </p>

          </details>


          <details>

            <summary>
              How do withdrawals work?
            </summary>

            <p class="muted">
              Add a bank account, let the
              server verify it, submit a
              withdrawal, then authorized
              operations staff process the
              provider transfer. Final status
              is recorded from the provider event.
            </p>

          </details>


          <details>

            <summary>
              Where is my personal data stored?
            </summary>

            <p class="muted">
              Account and profile records are
              stored in the Aurevia D1 database
              attached to the Cloudflare Worker.
            </p>

          </details>


          <details>

            <summary>
              What happens if payment is interrupted?
            </summary>

            <p class="muted">
              The payment remains pending until
              provider verification or a webhook
              establishes the final state.
            </p>

          </details>
        `
      )}


      ${card(
        'Support',
        'ACCOUNT SUPPORT',

        `
          <p class="muted">
            Configure your support contact
            and notification provider in the
            deployment environment.
          </p>
        `
      )}
    `
  );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout(){

  try{

    /*
     * Sends the HttpOnly Worker cookie.
     *
     * The Worker revokes the server session.
     */
    await api(
      '/api/auth/logout',
      {
        method:'POST'
      }
    );

  }catch{}


  /*
   * Remove only the local UI copy.
   *
   * The actual secure cookie is handled
   * by the Worker.
   */
  clearSession();


  sessionStorage.removeItem(
    BOOT_KEY
  );


  sessionStorage.removeItem(
    SECTION_READY_KEY
  );


  sessionStorage.removeItem(
    SECTION_BUSY_KEY
  );


  /*
   * Return to the login/startup experience.
   */
  location.replace(
    'index.html?loggedout=1'
  );
}


/* =========================================================
   APP INITIALIZATION
   ========================================================= */

const appContent=
  $('.content');


nav();


/* =========================================================
   NAV CLICK HANDLER
   ========================================================= */

document.addEventListener(
  'click',
  async e=>{

    const t=
      e.target.closest(
        '[data-page]'
      );


    if(!t)return;


    const p=
      t.dataset.page;


    if(p==='logout'){

      e.preventDefault();


      await logout();


      return;
    }


    /*
     * Normal anchor navigation is preserved.
     */
    if(
      t.tagName.toLowerCase()==='a'
    ){

      return;
    }


    e.preventDefault();


    if(
      sessionStorage.getItem(
        SECTION_BUSY_KEY
      )==='1'
    ){

      return;
    }


    sessionStorage.setItem(
      SECTION_BUSY_KEY,
      '1'
    );


    const target=
      p==='dashboard'
        ?'index.html'
        :p+'.html';


    const hide=
      sectionTransition(
        p==='dashboard'
          ?'Dashboard'
          :(pages[p]?.[0]||
            'Section')
      );


    await sleep(
      2000
    );


    hide();


    sessionStorage.setItem(
      SECTION_READY_KEY,
      '1'
    );


    sessionStorage.removeItem(
      SECTION_BUSY_KEY
    );


    location.href=
      target;
  }
);


/* =========================================================
   MENU
   ========================================================= */

$('#menuBtn')?.addEventListener(
  'click',
  ()=>{
    $('#sidebar')
      ?.classList.add(
        'open'
      );

    $('#scrim')
      ?.classList.add(
        'show'
      );
  }
);


$('#scrim')?.addEventListener(
  'click',
  ()=>{
    $('#sidebar')
      ?.classList.remove(
        'open'
      );

    $('#scrim')
      ?.classList.remove(
        'show'
      );
  }
);


$('#profileBtn')?.addEventListener(
  'click',
  ()=>{
    location.href=
      'profile.html';
  }
);


/* =========================================================
   TOAST
   ========================================================= */

function toast(msg){

  const t=
    $('#toast');


  if(!t)return;


  t.textContent=
    msg;


  t.classList.add(
    'show'
  );


  setTimeout(
    ()=>t.classList.remove(
      'show'
    ),
    2800
  );
}


/* =========================================================
   CLOCK
   ========================================================= */

function clock(){

  if($('#clock')){

    $('#clock').textContent=
      new Date().toLocaleString(
        [],
        {
          weekday:'short',
          month:'short',
          day:'2-digit',
          hour:'2-digit',
          minute:'2-digit'
        }
      );
  }
}


setInterval(
  clock,
  1000
);


clock();


/* =========================================================
   SCROLL POSITION
   ========================================================= */

const SCROLL_KEY=
  'aurevia_scroll_positions_v1';


function scrollPositions(){

  try{

    return JSON.parse(
      sessionStorage.getItem(
        SCROLL_KEY
      )||'{}'
    );

  }catch{

    return {};
  }
}


function saveScrollPosition(){

  const k=
    location.pathname;


  const all=
    scrollPositions();


  all[k]=
    window.scrollY||
    document.documentElement.scrollTop||
    0;


  sessionStorage.setItem(
    SCROLL_KEY,
    JSON.stringify(all)
  );
}


window.addEventListener(
  'beforeunload',
  saveScrollPosition
);


/* =========================================================
   PAGE RENDER
   ========================================================= */

async function render(
  page
){

  const p=
    pages[page]
      ?page
      :'dashboard';


  if($('#pageTitle')){

    $('#pageTitle').textContent=
      pages[p][0];
  }


  document
    .querySelectorAll(
      '.nav-item'
    )
    .forEach(
      a=>
        a.classList.toggle(
          'active',
          a.dataset.page===p
        )
    );


  const f={
    dashboard,
    deposit,
    history:historyPage,
    trades,
    withdraw,
    'withdraw-history':
      withdrawHistory,
    markets:marketsPage,
    profile,
    upgrade,
    password,
    settings,
    notifications,
    help,
    logout
  }[p];


  if(typeof f!=='function'){
    return;
  }


  await withSectionTransition(
    p==='dashboard'
      ?'Dashboard'
      :pages[p][0],
    f
  );


  const y=
    scrollPositions()[
      location.pathname
    ];


  if(
    Number.isFinite(y)
  ){

    requestAnimationFrame(
      ()=>window.scrollTo({
        top:y,
        left:0,
        behavior:'auto'
      })
    );
  }
}


/* =========================================================
   START
   ========================================================= */

async function start(){

  /*
   * Startup animation.
   */
  await bootLoader();


  /*
   * Authentication is checked against the
   * real Worker session.
   */
  if(
    !(await requireAuth())
  ){

    return;
  }


  const path=
    location.pathname
      .split('/')
      .pop()
      .replace(
        '.html',
        ''
      );


  await render(
    path==='index'||
    !path
      ?'dashboard'
      :pages[path]
        ?path
        :'dashboard'
  );
}


start();