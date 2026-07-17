import UploadPDF from "@/components/home/uploadpdf";
import VisualizeBlurb from "@/components/home/visualizeblurb";
import PreviousPapers from "@/components/home/previouspapers";
import UploadPopup from "@/components/home/uploadpopup";

export default function Home() {

  return (
    <main>
      {/* TODO: insert navbar here */}


      {/* Upper Desk Section */}
      {/* "Visualize..." hero blurb + Upload PDF */}
      <section
        className="sticky top-[-80%] h-[90vh] max-h-[700px] w-full bg-cover bg-center shadow-xl/50 flex items-center justify-center gap-10"
        style={{ backgroundImage: "url('/background/wood.png')" }}
      >
        <VisualizeBlurb/>
        <UploadPDF/>
        
        <UploadPopup/>
        
      </section>


      {/* Previous Papers Section */}
      <PreviousPapers/>
      

      {/* Drawer Background */}
      {/* fixed to the bottom of the screen to give "pulling out drawer" effect */}
      {/* borders adapt to screen size */}
      <div className="drawer-bg fixed bottom-0 left-0 w-full h-screen box-border -z-10"></div>

    </main>
  );

}

