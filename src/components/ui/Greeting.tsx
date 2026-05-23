import { getHour, user } from '../../utils'

const Greeting = () => {
  return (
    <div className="text-center mt-10">
      <h1 className="text-3xl font-semibold text-white">
        {getHour()}, {user}
      </h1>
      <h2 className="text-3xl font-semibold text-neutral-500">
        ¿Cómo puedo ayudarte hoy?
      </h2>
    </div>
  );
};

export default Greeting;
