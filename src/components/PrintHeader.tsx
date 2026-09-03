import logo from "@/assets/logo.png";

const HEADER_BLUE = "#1D325F"; // Matches the dark navy in image

export function PrintHeader() {
  return (
    <div className="flex items-center justify-start pb-4 mb-6">
      <img src={logo} alt="Bee Tee Logo" className="w-[120px] h-[120px] object-contain mr-6" />
      <div className="flex-1 flex flex-col items-start">
        <h1 className="font-black text-[42px] tracking-[-2px] leading-[1.1] uppercase m-0 text-[#1D325F]" style={{ fontFamily: 'Arial Black, sans-serif', fontWeight: 900 }}>
          Lamido CarsMOBILE
        </h1>
        <div className="w-full text-left space-y-0.5 mt-1">
          <p className="text-[13px] font-bold text-black m-0 leading-tight">
            Address: <span className="font-normal">Plot 36A &amp; 36B Wole Soyinka way, Cadastral zone B15, Jahi, Abuja.</span>
          </p>
          <p className="text-[13px] font-bold text-black m-0 leading-tight">
            Tel: <span className="font-normal">09077777211, 09162228881</span>
          </p>
          <p className="text-[13px] font-bold text-black m-0 leading-tight">
            Email: <span className="font-normal text-[#3682be] italic underline underline-offset-2">Lamidoautomobile@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// For use inside string-based html window popups
export function getPrintHeaderHTML(base64Logo?: string) {
  const logoUrl = base64Logo || `${window.location.origin}${logo}`;
  return `
    <div style="display: flex; align-items: center; justify-content: flex-start; padding-bottom: 12px; margin-bottom: 24px;">
      <img src="${logoUrl}" style="width: 120px; height: 120px; object-fit: contain; margin-right: 20px;" />
      <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; color: ${HEADER_BLUE};">
        <h1 style="font-family: Arial Black, sans-serif; font-weight: 900; font-size: 42px; margin: 0; color: ${HEADER_BLUE}; text-transform: uppercase; letter-spacing: -2px; line-height: 1.1;">
          Lamido CarsMOBILE
        </h1>
        <div style="margin-top: 4px; width: 100%; text-align: left;">
          <p style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; margin: 2px 0; color: #000;">
            Address: <span style="font-weight: normal;">Plot 36A &amp; 36B Wole Soyinka way, Cadastral zone B15, Jahi, Abuja.</span>
          </p>
          <p style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; margin: 2px 0; color: #000;">
            Tel: <span style="font-weight: normal;">09077777211, 09162228881</span>
          </p>
          <p style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; margin: 2px 0; color: #000;">
            Email: <span style="color: #3682be; text-decoration: underline; font-style: italic; font-weight: normal;">Lamidoautomobile@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  `;
}

// React component for watermark
export function PrintWatermark() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.4] select-none">
      <img src={logo} alt="Watermark" className="w-[500px] h-[500px] object-contain opacity-20" />
    </div>
  );
}

// For use inside string-based html window popups
export function getPrintWatermarkHTML(base64Logo?: string) {
  const logoUrl = base64Logo || `${window.location.origin}${logo}`;
  return `
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
      opacity: 0.15;
      user-select: none;
    ">
      <img src="${logoUrl}" style="width: 550px; height: 550px; max-width: 90%; max-height: 90%; object-fit: contain;" />
    </div>
  `;
}

