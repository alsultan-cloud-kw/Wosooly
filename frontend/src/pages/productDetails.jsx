import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../../api_config'

const ProductDetails = () => {
  const { id } = useParams()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    api.get('/products/${id}').then((res) => {
      setProduct(res.data)
    })
  }, [id])

  if (!product) return <div>Loading...</div>

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{product.name}</h2>
      <p dangerouslySetInnerHTML={{ __html: product.short_description }}></p>
      <p>Price: {product.regular_price}</p>
      {/* Add more product fields here */}
    </div>
  )
}

export default ProductDetails