// TODO: repurpose as a general popup window with custom title and contents

export default function UploadPopup() {
  return (
    <dialog className="absolute inset-0 m-auto block w-[50%] min-w-[300px] aspect-3/2 bg-off-white p-6 shadow-lg/50">
      <div className="size-full border-dark-brown border-2 flex flex-col items-center">
        <label className="relative -top-6 w-fit bg-off-white p-2">
            {/* Title goes here */}
            Uploading PDF...
        </label>
        {/* Contents go here */}
        <img className="absolute inset-0 m-auto" src="/interface/loading.gif" alt="loading..."/>
      </div>
    </dialog>
  );
}