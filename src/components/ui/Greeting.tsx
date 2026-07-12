import { getHour, user } from '../../utils'

const Greeting = () => {
  return (
    <div className="text-center mt-10 select-none">
      <h1 className="text-3xl font-semibold text-[#0f0f0f]">
        {getHour()}, {user}
      </h1>
      <h2 className="text-3xl font-semibold text-[#737373]">
        ¿Cómo puedo ayudarte hoy?
      </h2>
    </div>
  );
};

export default Greeting;
