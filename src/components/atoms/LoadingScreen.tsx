import marshmallowSvg from "/marshmallow.svg";
import "./LoadingScreen.scss";

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img className="loading-screen__spinner" src={marshmallowSvg} alt="" />
    </div>
  );
}
