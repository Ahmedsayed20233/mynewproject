(function(){
 if(!("serviceWorker" in navigator)||location.protocol!=="https:")return;
 window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=400",{scope:"./"})
  .then(()=>console.info("Flosy offline app shell enabled"))
  .catch(err=>console.warn("Flosy offline mode unavailable:",err.message)));
})();