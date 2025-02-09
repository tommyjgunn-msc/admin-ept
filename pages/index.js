export default function Home() {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting...</p>
      </div>
    );
  }
  
  export async function getServerSideProps() {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }