import { ColorRing } from "react-loader-spinner";

export function GlobalSpinner() {
  return (
    <ColorRing
      visible={true}
      height="80"
      width="100"
      ariaLabel="color-ring-loading"
      wrapperStyle={{}}
      wrapperClass="color-ring-wrapper"
      colors={["#5433ff", "#765bff", "#9884ff", "#baadff", "#5433ff"]}
    />
  );

}
